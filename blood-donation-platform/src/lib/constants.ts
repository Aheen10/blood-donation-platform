export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const ROLES = ["donor", "requester", "admin"] as const;
export const URGENCY_LEVELS = ["critical", "high", "normal"] as const;
export const REQUEST_STATUSES = ["open", "matched", "fulfilled", "closed", "flagged"] as const;
export const NOTIFICATION_TYPES = [
  "match_request",
  "donor_accepted",
  "request_fulfilled",
  "eligibility_reminder",
  "message",
  "request_shared",
  "report_update",
  "account_action",
  "system",
] as const;

// Fraud / misuse reports
export const REPORT_REASONS = [
  "blood_selling", // took blood for an "emergency" and sold it
  "fake_request", // emergency was not real
  "no_show", // agreed to donate and never came / demanded money
  "harassment",
  "other",
] as const;
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  blood_selling: "Took blood and sold it",
  fake_request: "Fake emergency request",
  no_show: "No-show / demanded money",
  harassment: "Harassment or abuse",
  other: "Other",
};
export const REPORT_ACTIONS = ["restrict", "ban"] as const;
export const REPORT_STATUSES = ["pending", "approved", "rejected"] as const;

// Minimum written explanation for a report (characters)
export const MIN_REPORT_DESCRIPTION = 20;

// Messaging
export const MAX_MESSAGE_LENGTH = 1000;

// Sharing / forwarding a request to friends
export const MAX_SHARES_PER_REQUEST = 20;

// Minimum gap between two donations (days)
export const DONATION_GAP_DAYS = 90;

// How many donors get notified in each escalation round
export const DONORS_PER_ROUND = 5;

// Minutes to wait for a response before escalating, by urgency
export const ESCALATION_WINDOW_MINUTES = {
  critical: 10,
  high: 20,
  normal: 45,
} as const;

// Maximum search radius (km) for matching
export const MAX_SEARCH_RADIUS_KM = 50;

// Max emergency requests one user may submit per hour (misuse prevention)
export const MAX_REQUESTS_PER_HOUR = 3;

// Timezone used for "this month" / "this year" donation dashboards
export const APP_TIMEZONE = "Asia/Dhaka";