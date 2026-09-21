import type { StatusBadgeTone } from "@/components/ui/status-badge/status-badge";
import type { TripRequestStatus } from "../application/trip-lifecycle";

const statusTones: Record<TripRequestStatus, StatusBadgeTone> = {
  New: "purple",
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
