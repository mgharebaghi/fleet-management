import type { NewAssignment } from "../application/driver-records";

export const ASSIGNMENT_NEAR_END_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type AssignmentTimeStatus = {
  kind: "future" | "active" | "nearEnd" | "ended" | "openEnded";
  label: string;
  tone: "info" | "positive" | "warning" | "negative";
};

/** Seven days is a feature-local visual convention, not an assignment rule. */
export function getAssignmentTimeStatus(
  assignment: Pick<NewAssignment, "fromDateTime" | "toDateTime">,
  now: Date,
): AssignmentTimeStatus {
  if (assignment.fromDateTime > now) return { kind: "future", label: "آینده", tone: "info" };
  if (assignment.toDateTime === null) return { kind: "openEnded", label: "فعال — بدون تاریخ پایان", tone: "positive" };
  if (assignment.toDateTime <= now) return { kind: "ended", label: "پایان‌یافته", tone: "negative" };
  if (assignment.toDateTime.getTime() - now.getTime() <= ASSIGNMENT_NEAR_END_WINDOW_MS) return { kind: "nearEnd", label: "نزدیک پایان", tone: "warning" };
  return { kind: "active", label: "فعال", tone: "positive" };
}

/** Position of "now" between the assignment's bounds, for the timeline bar. Null marks an open end, which has no fixed length to plot. */
export function getAssignmentProgress(
  assignment: Pick<NewAssignment, "fromDateTime" | "toDateTime">,
  now: Date,
): number | null {
  if (assignment.fromDateTime > now) return 0;
  if (assignment.toDateTime === null) return null;
  if (assignment.toDateTime <= now) return 1;
  const total = assignment.toDateTime.getTime() - assignment.fromDateTime.getTime();
  return total <= 0 ? 1 : (now.getTime() - assignment.fromDateTime.getTime()) / total;
}
