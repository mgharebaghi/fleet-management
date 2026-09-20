import type { TripAssignmentReference } from "./trip-records";

export type AssignmentIneligibilityReason =
  | "INACTIVE_DRIVER"
  | "INACTIVE_VEHICLE"
  | "INACTIVE_TIME_RANGE"
  | "INVALID_LICENSE";

export function assignmentCoversInstant(
  assignment: Pick<TripAssignmentReference, "fromDateTime" | "toDateTime">,
  activeAt: Date,
): boolean {
  return (
    assignment.fromDateTime <= activeAt &&
    (assignment.toDateTime === null || activeAt < assignment.toDateTime)
  );
}

export function assignmentIneligibilityReasons(
  assignment: TripAssignmentReference,
  activeAt: Date,
): AssignmentIneligibilityReason[] {
  const reasons: AssignmentIneligibilityReason[] = [];
  if (!assignment.driverIsActive) reasons.push("INACTIVE_DRIVER");
  if (!assignment.vehicle.isActive) reasons.push("INACTIVE_VEHICLE");
  if (!assignmentCoversInstant(assignment, activeAt)) {
    reasons.push("INACTIVE_TIME_RANGE");
  }
  if (!assignment.hasEligibleLicense) reasons.push("INVALID_LICENSE");
  return reasons;
}

export function isAssignmentEligible(
  assignment: TripAssignmentReference,
  activeAt: Date,
): boolean {
  return assignmentIneligibilityReasons(assignment, activeAt).length === 0;
}
