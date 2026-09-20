import type { TripRequestStatus } from "../application/trip-lifecycle";

type StatusBadgeTone = "positive" | "negative" | "warning" | "info";

const statusTones: Record<TripRequestStatus, StatusBadgeTone> = {
  New: "info",
  Assigned: "warning",
  InProgress: "info",
  Completed: "positive",
  Cancelled: "negative",
};

export function tripRequestStatusTone(status: string): StatusBadgeTone {
  if (status in statusTones) {
    return statusTones[status as TripRequestStatus];
  }
  return "info";
}
