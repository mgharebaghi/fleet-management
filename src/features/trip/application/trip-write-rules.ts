import type { TripAssignmentReference, TripFailure, TripLocationInputFailure, TripLocationInputRole, TripResult } from "./trip-records";
import { assignmentIneligibilityReasons } from "./trip-assignment-eligibility";

export const failure = (error: TripFailure, field?: string): TripResult => ({
  success: false,
  error,
  ...(field ? { field } : {}),
});

export function locationInputFailure(
  error: "LOCATION_NOT_FOUND" | "LOCATION_INACTIVE" | "SAME_ORIGIN_DESTINATION",
  passengerIndex: number,
  locationRole: TripLocationInputRole,
): TripResult {
  const failedLocation: TripLocationInputFailure = {
    passengerIndex,
    locationRole,
  };
  return { success: false, error, failedLocation };
}

export function assignmentFailure(
  assignment: Pick<TripAssignmentReference, "driverIsActive" | "vehicle" | "hasEligibleLicense">,
  activeAt: Date,
  fromDateTime: Date,
  toDateTime: Date | null,
): TripFailure | null {
  const reason = assignmentIneligibilityReasons({ ...assignment, fromDateTime, toDateTime }, activeAt)[0];
  if (reason === "INACTIVE_DRIVER") return "DRIVER_INACTIVE";
  if (reason === "INACTIVE_VEHICLE") return "VEHICLE_INACTIVE";
  if (reason === "INACTIVE_TIME_RANGE") return "ASSIGNMENT_NOT_ACTIVE";
  if (reason === "INVALID_LICENSE") return "NO_ELIGIBLE_LICENSE";
  return null;
}
