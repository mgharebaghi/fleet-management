"use client";

import { useEditableActionState } from "../../../shared/presentation/use-editable-action-state";

const errorFields = {
  INVALID_ID: ["personId", "vehicleId"],
  LICENSE_TYPE_REQUIRED: ["licenseType"],
  LICENSE_TYPE_TOO_LONG: ["licenseType"],
  LICENSE_NO_REQUIRED: ["licenseNo"],
  LICENSE_NO_TOO_LONG: ["licenseNo"],
  LICENSE_EXISTS: ["licenseNo"],
  PERSON_NOT_FOUND: ["personId"],
  PERSON_INACTIVE: ["personId"],
  DRIVER_EXISTS: ["personId"],
  VEHICLE_NOT_FOUND: ["vehicleId"],
  VEHICLE_INACTIVE: ["vehicleId"],
  VEHICLE_UNDER_REPAIR: ["vehicleId"],
  VEHICLE_REPAIR_STATE_UNKNOWN: ["vehicleId"],
  VEHICLE_DISPATCH_CHANGED: ["vehicleId"],
  VEHICLE_CURRENTLY_ASSIGNED: ["vehicleId"],
  INVALID_DATE: ["issueDate", "expireDate", "fromDay", "fromTime", "toDay", "toTime"],
  ISSUE_IN_FUTURE: ["issueDate"],
  EXPIRY_BEFORE_ISSUE: ["issueDate", "expireDate"],
  INVALID_PERIOD: ["fromDay", "fromTime", "toDay", "toTime"],
  INVALID_ODOMETER: ["startOdometer", "endOdometer"],
  ODOMETER_DECREASE: ["startOdometer", "endOdometer"],
  DESCRIPTION_TOO_LONG: ["description"]
} as const;

export function useDriversFormState<State>(action: (previous: State, data: FormData) => State | Promise<State>, initial: State) {
  return useEditableActionState(action, initial, errorFields);
}
