import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import type { Role } from "@/types";

export interface GuardUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isRestricted: boolean;
}

type Guard = { ok: true; user: GuardUser } | { ok: false; res: NextResponse };

/**
 * Use at the top of every protected API route:
 *
 *   const g = await requireUser({ roles: ["admin"] });
 *   if (!g.ok) return g.res;
 *   const user = g.user;
 *
 * It re-checks the database on every call, so a user banned by an admin is
 * locked out immediately, even if their login token is still valid.
 * Restricted users are rejected unless `allowRestricted: true` (use that for read-only routes).
 */
export async function requireUser(
  opts: { roles?: Role[]; allowRestricted?: boolean } = {}
): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, res: NextResponse.json({ error: "Please log in" }, { status: 401 }) };
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("name email role isBlocked isRestricted");
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Account not found" }, { status: 401 }) };
  }
  if (user.isBlocked) {
    return { ok: false, res: NextResponse.json({ error: "This account has been banned" }, { status: 403 }) };
  }
  if (user.isRestricted && !opts.allowRestricted) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Your account is restricted. You can view the site but cannot take this action." },
        { status: 403 }
      ),
    };
  }
  if (opts.roles && !opts.roles.includes(user.role as Role)) {
    return { ok: false, res: NextResponse.json({ error: "Not allowed" }, { status: 403 }) };
  }

  return {
    ok: true,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role as Role,
      isRestricted: !!user.isRestricted,
    },
  };
}