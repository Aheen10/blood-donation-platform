import { randomBytes } from "crypto";

/** Short random code for public share links, e.g. "k3J9xQ2mP1". */
export function generateShareCode(): string {
  return randomBytes(8).toString("base64url");
}

/** Compare two ids (ObjectId or string) safely. */
export function sameId(a: unknown, b: unknown): boolean {
  return String(a) === String(b);
}

/** True if `id` is in a list of ids (ObjectIds or strings). */
export function includesId(list: unknown[] | undefined | null, id: unknown): boolean {
  return !!list?.some((x) => sameId(x, id));
}