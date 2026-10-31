import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { createRequestSchema } from "@/lib/validators";
import { generateShareCode } from "@/lib/utils";
import { MAX_REQUESTS_PER_HOUR } from "@/lib/constants";
import BloodRequest from "@/models/BloodRequest";

// GET /api/requests            -> open requests (public-safe fields only)
// GET /api/requests?mine=1     -> requests I created
export async function GET(req: Request) {
  const g = await requireUser({ allowRestricted: true });
  if (!g.ok) return g.res;
  await connectDB();

  const mine = new URL(req.url).searchParams.get("mine") === "1";
  const filter = mine ? { requester: g.user.id } : { status: { $in: ["open", "matched"] } };

  const docs = await BloodRequest.find(filter)
    .select("bloodGroup unitsNeeded urgency hospitalName city status shareCode createdAt acceptedDonors")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    requests: docs.map((d) => ({
      id: String(d._id),
      shareCode: d.shareCode,
      bloodGroup: d.bloodGroup,
      unitsNeeded: d.unitsNeeded,
      urgency: d.urgency,
      hospitalName: d.hospitalName,
      city: d.city,
      status: d.status,
      acceptedCount: d.acceptedDonors?.length ?? 0,
      createdAt: d.createdAt,
    })),
  });
}

// POST /api/requests -> create an emergency request
export async function POST(req: Request) {
  const g = await requireUser(); // restricted users cannot create requests
  if (!g.ok) return g.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  await connectDB();

  // Misuse prevention: limit how many requests one user can open per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await BloodRequest.countDocuments({
    requester: g.user.id,
    createdAt: { $gte: oneHourAgo },
  });
  if (recent >= MAX_REQUESTS_PER_HOUR) {
    return NextResponse.json(
      { error: `You can create at most ${MAX_REQUESTS_PER_HOUR} requests per hour. Please try later.` },
      { status: 429 }
    );
  }

  const doc = await BloodRequest.create({
    requester: g.user.id,
    patientName: d.patientName,
    bloodGroup: d.bloodGroup,
    unitsNeeded: d.unitsNeeded,
    urgency: d.urgency,
    hospitalName: d.hospitalName,
    city: d.city,
    location: { lat: d.lat, lng: d.lng },
    contactPhone: d.contactPhone,
    note: d.note,
    shareCode: generateShareCode(),
  });

  // TODO (Aheen): call the matching engine / escalation agent here to notify the first group of donors.

  return NextResponse.json({ id: String(doc._id), shareCode: doc.shareCode }, { status: 201 });
}
