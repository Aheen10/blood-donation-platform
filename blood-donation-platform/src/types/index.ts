import {
  BLOOD_GROUPS,
  ROLES,
  URGENCY_LEVELS,
  REQUEST_STATUSES,
  NOTIFICATION_TYPES,
} from "@/lib/constants";

export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type Role = (typeof ROLES)[number];
export type Urgency = (typeof URGENCY_LEVELS)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface GeoPoint {
  lat: number;
  lng: number;
}