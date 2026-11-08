import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { DONATION_GAP_DAYS } from "@/lib/constants";
import User from "@/models/User";
import BloodRequest from "@/models/BloodRequest";
import { getDonorStatus } from "@/lib/donorStatus";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1500) }))
    .max(10)
    .default([]),
});

interface OpenRequest {
  bloodGroup?: string;
  urgency?: string;
  hospitalName?: string;
  unitsNeeded?: number;
  city?: string;
}

function fmt(d: Date | null) {
  return d ? d.toISOString().slice(0, 10) : "never";
}

// POST /api/assistant { message, history } -> { reply }
// A Gemini-powered assistant that also knows the logged-in member's own donor data from MongoDB.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  await connectDB();
  const user = await User.findById(session.user.id).select("isBlocked");
  if (!user || user.isBlocked) {
    return NextResponse.json({ error: "Account is not active" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "The assistant is not configured yet (missing GEMINI_API_KEY)." }, { status: 503 });
  }
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please type a message (max 500 characters)." }, { status: 400 });
  }
  const { message } = parsed.data;
  const history = [...parsed.data.history];
  // Gemini needs the conversation to start with a user turn
  while (history.length > 0 && history[0].role !== "user") history.shift();

  // ----- Facts from the database (only this member's own data + public request info) -----
  const status = await getDonorStatus(String(session.user.id));
  const filter: Record<string, unknown> = { status: { $in: ["open", "matched"] } };
  if (status.city) filter.city = status.city;
  const open = (await BloodRequest.find(filter)
    .select("bloodGroup urgency hospitalName unitsNeeded city")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()) as unknown as OpenRequest[];

  const facts = [
    `Is registered as a donor: ${status.isDonor ? "yes" : "no"}`,
    status.isDonor ? `Blood group: ${status.bloodGroup}` : null,
    status.isDonor ? `City: ${status.city}` : null,
    status.isDonor ? `Currently available to donate: ${status.isAvailable ? "yes" : "no (paused)"}` : null,
    `Confirmed donations so far: ${status.totalDonations}`,
    `Last donation date: ${fmt(status.lastDonationDate)}`,
    status.canDonateNow
      ? "Eligible to donate again: yes, right now"
      : `Eligible to donate again from: ${fmt(status.nextEligibleDate)} (${status.daysUntilEligible} days left)`,
    open.length
      ? "Open blood requests" +
        (status.city ? ` in ${status.city}` : "") +
        ": " +
        open
          .map((r) => `${r.bloodGroup} x${r.unitsNeeded ?? 1} (${r.urgency}) at ${r.hospitalName}, ${r.city}`)
          .join("; ")
      : "Open blood requests: none right now",
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are the assistant of BloodConnect, a blood donation and emergency response platform in Bangladesh.
Help members with questions about donating blood, eligibility, blood group compatibility and how to use the platform.

Rules:
- Use the MEMBER FACTS below to answer questions about this member. Never invent facts about them. If something is not in the facts, say you do not know.
- This platform requires a gap of ${DONATION_GAP_DAYS} days between two donations.
- You are not a doctor. For medical conditions, medicines, pregnancy, illness or any doubt about health, advise the member to ask a doctor or the blood bank. Do not diagnose.
- If someone describes a medical emergency, tell them to call 999 or go to the nearest hospital immediately.
- Never reveal or ask for other people's personal information (phone numbers, patient names).
- Answer in the same language the member writes in (Bengali or English). Keep answers short and practical.
- If the question is unrelated to blood donation or this platform, politely say you can only help with that.

MEMBER FACTS:
${facts}`;

  const contents = [
    ...history.map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Gemini error", res.status, detail.slice(0, 500));
      if (res.status === 429) {
        return NextResponse.json({ error: "Too many questions right now. Please try again in a minute." }, { status: 429 });
      }
      if (res.status === 404) {
        return NextResponse.json({ error: `Model "${model}" was not found. Check GEMINI_MODEL in .env.` }, { status: 502 });
      }
      if (res.status === 400 || res.status === 403) {
        return NextResponse.json({ error: "The Gemini key or request was rejected. Check GEMINI_API_KEY in .env." }, { status: 502 });
      }
      return NextResponse.json({ error: "The assistant is busy. Please try again." }, { status: 502 });
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!reply) {
      return NextResponse.json({ error: "The assistant could not answer that. Try rephrasing." }, { status: 502 });
    }
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Gemini request failed", err);
    return NextResponse.json({ error: "Could not reach the assistant. Check your internet and try again." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}