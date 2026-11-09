import { BLOOD_GROUPS } from "@/lib/constants";

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

// Which donor groups a recipient of each group can safely receive blood from.
// TODO (teammate task): replace with canDonate() from lib/compatibility.ts once merged.
const CAN_RECEIVE_FROM: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};

export function compatibleDonorGroups(recipientGroup: string): BloodGroup[] {
  return CAN_RECEIVE_FROM[recipientGroup as BloodGroup] ?? [];
}

/**
 * Straight-line distance between two points in km (Haversine formula).
 * TODO (teammate task): replace with the function from lib/distance.ts once merged.
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}