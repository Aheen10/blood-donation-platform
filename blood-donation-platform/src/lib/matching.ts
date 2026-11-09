import { connectDB } from "@/lib/db";
import {
  MAX_SEARCH_RADIUS_KM,
  ESCALATION_WINDOW_MINUTES,
  DONATION_GAP_DAYS,
} from "@/lib/constants";
import { notifyInApp } from "@/lib/notifications";
import { compatibleDonorGroups, distanceKm } from "@/lib/matchingHelpers";
import BloodRequest from "@/models/BloodRequest";
import DonorProfile from "@/models/DonorProfile";
import User from "@/models/User";
import AgentLog from "@/models/AgentLog";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** After this many rounds the agent stops widening the search. */
export const MAX_ROUNDS = 5;

// Round 1 = LIVE round: donors whose phone/browser location is on right now.
const LIVE_FRESH_MS = 5 * MINUTE_MS; // a live point older than this is ignored
const LIVE_RADII_KM = [5, 10]; // look within 5 km first, then 10 km
const LIVE_MAX = 20; // at most this many live donors in the first round

// Round 2 onwards = SAVED-LOCATION rounds: 10 donors at a time from the database.
const STORED_PER_ROUND = 10;

/** Search radius for the saved-location rounds. */
export function radiusForRound(round: number): number {
  const km = round <= 2 ? 10 : round === 3 ? 25 : MAX_SEARCH_RADIUS_KM;
  return Math.min(km, MAX_SEARCH_RADIUS_KM);
}

interface Point {
  lat?: number;
  lng?: number;
  updatedAt?: Date;
}

interface RequestLean {
  _id: unknown;
  requester: unknown;
  bloodGroup: string;
  unitsNeeded?: number;
  urgency?: string;
  hospitalName: string;
  city: string;
  location?: Point;
  status: string;
  currentRound?: number;
  notifiedDonors?: unknown[];
  acceptedDonors?: unknown[];
  declinedDonors?: unknown[];
  lastEscalatedAt?: Date | null;
  createdAt?: Date;
}

interface ProfileLean {
  user: unknown;
  bloodGroup: string;
  location?: Point;
  liveLocation?: Point;
  lastDonationDate?: Date | null;
  nextEligibleDate?: Date | null;
}

interface Candidate {
  userId: string;
  group: string;
  distance: number;
  exact: boolean;
  ageMin?: number; // how old the live point is, live round only
}

export interface RoundResult {
  requestId: string;
  round: number;
  radiusKm: number;
  found: number;
  notified: number;
  skipped?: string;
}

/**
 * One round of the matching agent for one request.
 *  - Round 1 (live): compatible, eligible donors who are sharing their live location right now,
 *    within 5 km (or 10 km if nobody is that close). They get the request first.
 *  - If nobody is live nearby, the agent goes straight on to round 2.
 *  - Round 2+ (saved location): the best 10 donors by their saved location, widening 10 -> 25 -> 50 km.
 * Every decision is written to AgentLog with its reason.
 */
export async function runMatchingRound(requestId: string): Promise<RoundResult> {
  await connectDB();

  const request = (await BloodRequest.findById(requestId).lean()) as unknown as RequestLean | null;
  if (!request) {
    return { requestId, round: 0, radiusKm: 0, found: 0, notified: 0, skipped: "Request not found" };
  }
  if (request.status !== "open" && request.status !== "matched") {
    return { requestId, round: request.currentRound ?? 0, radiusKm: 0, found: 0, notified: 0, skipped: "Request is not open" };
  }

  const previousRound = request.currentRound ?? 0;
  const round = previousRound + 1;
  const live = round === 1;
  const rLat = request.location?.lat;
  const rLng = request.location?.lng;
  const now = Date.now();

  // People who must not be contacted again
  const exclude = new Set<string>([
    String(request.requester),
    ...(request.notifiedDonors ?? []).map(String),
    ...(request.acceptedDonors ?? []).map(String),
    ...(request.declinedDonors ?? []).map(String),
  ]);

  const filter: Record<string, unknown> = {
    bloodGroup: { $in: compatibleDonorGroups(request.bloodGroup) },
    isAvailable: true,
    consentToContact: true,
    user: { $nin: Array.from(exclude) },
  };
  if (live) {
    filter.shareLiveLocation = true;
    filter["liveLocation.updatedAt"] = { $gte: new Date(now - LIVE_FRESH_MS) };
  }
  const profiles = (await DonorProfile.find(filter).lean()) as unknown as ProfileLean[];

  // Eligibility + distance (from the live point in round 1, from the saved location afterwards)
  const all: Candidate[] = [];
  for (const p of profiles) {
    // TODO (teammate task): use isEligible() from lib/eligibility.ts once merged
    const next =
      p.nextEligibleDate ??
      (p.lastDonationDate ? new Date(new Date(p.lastDonationDate).getTime() + DONATION_GAP_DAYS * DAY_MS) : null);
    if (next && new Date(next).getTime() > now) continue;

    const point = live ? p.liveLocation : p.location;
    const lat = point?.lat;
    const lng = point?.lng;
    if (lat == null || lng == null || rLat == null || rLng == null) continue;

    all.push({
      userId: String(p.user),
      group: p.bloodGroup,
      distance: distanceKm(rLat, rLng, lat, lng),
      exact: p.bloodGroup === request.bloodGroup,
      ageMin: live && point?.updatedAt ? Math.round((now - new Date(point.updatedAt).getTime()) / MINUTE_MS) : undefined,
    });
  }

  // Choose the radius
  let radius: number;
  let candidates: Candidate[];
  if (live) {
    radius = LIVE_RADII_KM[LIVE_RADII_KM.length - 1];
    candidates = [];
    for (const r of LIVE_RADII_KM) {
      const within = all.filter((c) => c.distance <= r);
      if (within.length > 0) {
        radius = r;
        candidates = within;
        break;
      }
    }
  } else {
    radius = radiusForRound(round);
    candidates = all.filter((c) => c.distance <= radius);
  }

  // Banned or restricted accounts are never contacted
  if (candidates.length > 0) {
    const bad = (await User.find({
      _id: { $in: candidates.map((c) => c.userId) },
      $or: [{ isBlocked: true }, { isRestricted: true }],
    })
      .select("_id")
      .lean()) as unknown as { _id: unknown }[];
    const badIds = new Set(bad.map((u) => String(u._id)));
    candidates = candidates.filter((c) => !badIds.has(c.userId));
  }

  // Ranking: exact blood group first, then nearest
  candidates.sort((a, b) => Number(b.exact) - Number(a.exact) || a.distance - b.distance);
  const chosen = candidates.slice(0, live ? LIVE_MAX : STORED_PER_ROUND);

  // Claim this round. If another run already advanced the round, do nothing (avoids double notifications).
  const claim = await BloodRequest.updateOne(
    { _id: requestId, currentRound: previousRound },
    {
      $inc: { currentRound: 1 },
      $set: { lastEscalatedAt: new Date() },
      ...(chosen.length ? { $addToSet: { notifiedDonors: { $each: chosen.map((c) => c.userId) } } } : {}),
    }
  );
  if (claim.modifiedCount === 0) {
    return { requestId, round: previousRound, radiusKm: radius, found: candidates.length, notified: 0, skipped: "Another run is handling this request" };
  }

  // Nobody found
  if (chosen.length === 0) {
    await AgentLog.create({
      request: requestId,
      action: "skip",
      round,
      reason: live
        ? `Round ${round} (live): no compatible donor is sharing a live location within ${radius} km right now. Moving on to saved locations.`
        : `Round ${round}: no eligible ${request.bloodGroup}-compatible donor within ${radius} km of their saved location. The search will be widened in the next round.`,
      meta: { phase: live ? "live" : "saved", radiusKm: radius, candidates: 0 },
    });
    // Do not waste time: if nobody is live nearby, go straight to the saved-location round
    if (live) return runMatchingRound(requestId);
    return { requestId, round, radiusKm: radius, found: 0, notified: 0 };
  }

  await AgentLog.create({
    request: requestId,
    action: round === 1 ? "match" : "escalate",
    round,
    reason: live
      ? `Round ${round} (live): found ${candidates.length} donor(s) sharing a live location within ${radius} km, notifying ${chosen.length}.`
      : `Round ${round}: searched ${radius} km around saved locations, found ${candidates.length} eligible donor(s), notifying the best ${chosen.length}.`,
    meta: { phase: live ? "live" : "saved", radiusKm: radius, candidates: candidates.length, urgency: request.urgency },
  });

  let notified = 0;
  for (const c of chosen) {
    try {
      await notifyInApp({
        userId: c.userId,
        type: "match_request",
        title: `${request.bloodGroup} blood needed (${request.urgency ?? "normal"})`,
        message: live
          ? `${request.hospitalName}, ${request.city} is about ${c.distance.toFixed(1)} km from your current location. Open the request to accept or decline.`
          : `${request.hospitalName}, ${request.city} is about ${c.distance.toFixed(1)} km from you. Open the request to accept or decline.`,
        requestId,
      });
      await AgentLog.create({
        request: requestId,
        action: "notify",
        round,
        donor: c.userId,
        reason: live
          ? `${c.group} can donate to ${request.bloodGroup}${c.exact ? " (exact match)" : ""}, live location ${c.distance.toFixed(1)} km away (updated ${c.ageMin ?? 0} min ago), eligible and available.`
          : `${c.group} can donate to ${request.bloodGroup}${c.exact ? " (exact match)" : ""}, saved location ${c.distance.toFixed(1)} km away, eligible and available.`,
        meta: { phase: live ? "live" : "saved", distanceKm: Number(c.distance.toFixed(2)), exact: c.exact },
      });
      notified++;
    } catch (err) {
      console.error("Notify failed", err);
    }
  }

  return { requestId, round, radiusKm: radius, found: candidates.length, notified };
}

export interface EscalationSummary {
  checked: number;
  escalated: number;
  results: RoundResult[];
}

/**
 * The escalation agent. Looks at every open request that has not been fulfilled yet and,
 * if nobody answered within the time window for its urgency, runs the next matching round.
 * force = true ignores the time window (used by the admin "Run now" button for demos).
 */
export async function runEscalation(opts: { force?: boolean } = {}): Promise<EscalationSummary> {
  await connectDB();

  const open = (await BloodRequest.find({
    status: { $in: ["open", "matched"] },
    currentRound: { $lt: MAX_ROUNDS },
  })
    .select("urgency unitsNeeded currentRound lastEscalatedAt createdAt acceptedDonors")
    .lean()) as unknown as RequestLean[];

  const results: RoundResult[] = [];
  const now = Date.now();

  for (const r of open) {
    const needed = r.unitsNeeded ?? 1;
    if ((r.acceptedDonors?.length ?? 0) >= needed) continue; // enough donors already accepted

    const windowMin =
      ESCALATION_WINDOW_MINUTES[(r.urgency ?? "normal") as keyof typeof ESCALATION_WINDOW_MINUTES] ?? 45;
    const since = new Date(r.lastEscalatedAt ?? r.createdAt ?? 0).getTime();
    const due = opts.force || now - since >= windowMin * MINUTE_MS;
    if (!due) continue;

    results.push(await runMatchingRound(String(r._id)));
  }

  return { checked: open.length, escalated: results.length, results };
}