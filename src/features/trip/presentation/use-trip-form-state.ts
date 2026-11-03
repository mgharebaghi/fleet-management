"use client";

import { useEditableActionState } from "../../../shared/presentation/use-editable-action-state";

const errorFields = {
  INVALID_DATE: ["accidentDay", "accidentTime", "violationDay", "violationTime"],
  LOCATION_TOO_LONG: ["accidentLocation"],
  INVALID_DAMAGE: ["damageAmount"],
  INVALID_FAULT: ["driverFaultPercent"],
  POLICE_REPORT_TOO_LONG: ["policeReportNo"],
  VIOLATION_TYPE_REQUIRED: ["violationType"],
  VIOLATION_TYPE_TOO_LONG: ["violationType"],
  INVALID_AMOUNT: ["violationAmount"],
  REFERENCE_TOO_LONG: ["referenceNo"],
  INVALID_RATING: ["passengerRating"],
  ROUTE_NAME_REQUIRED: ["routeName"],
  ROUTE_NAME_TOO_LONG: ["routeName"],
  ROUTE_DESCRIPTION_TOO_LONG: ["routeDescription"],
  PURPOSE_TOO_LONG: ["purpose"],
  INVALID_ASSIGNMENT_PASSENGERS: ["assignmentId"],
  ROUTE_POINT_DESCRIPTION_TOO_LONG: ["point.0.description"],
  INVALID_DISTANCE: ["distanceKm"],
  INVALID_DURATION: ["estimatedDurationMinute"],
} as const;

export function useTripFormState<State>(action: (previous: State, data: FormData) => State | Promise<State>, initial: State) {
  return useEditableActionState(action, initial, errorFields);
}
