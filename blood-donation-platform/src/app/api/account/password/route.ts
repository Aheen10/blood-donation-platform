import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireUser } from "@/lib/session";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
});

export async function POST(req: Request) {
  const auth = await requireUser({ allowRestricted: true });
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const id = (auth.user as unknown as { id: string }).id;
  const u = (await User.findById(id).select("+passwordHash")) as unknown as {
    passwordHash: string;
    save: () => Promise<unknown>;
  } | null;
  if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ok = await bcrypt.compare(parsed.data.currentPassword, u.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  u.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await u.save();
  return NextResponse.json({ ok: true });
}