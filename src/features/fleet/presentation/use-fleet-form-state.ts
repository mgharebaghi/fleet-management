"use client";

import { useEditableActionState } from "../../../shared/presentation/use-editable-action-state";

const errorFields = {
  name_already_exists: ["name"],
  brand_required: ["brandId"],
  brand_not_found: ["brandId"],
  vehicle_type_required: ["vehicleTypeId"],
  vehicle_type_not_found: ["vehicleTypeId"],
  fuel_type_required: ["fuelTypeId"],
  fuel_type_not_found: ["fuelTypeId"],
  VEHICLE_CODE_ALREADY_EXISTS: ["vehicleCode"],
  INTERNAL_PLATE_ALREADY_EXISTS: ["plateNoLeftSide", "plateNoCenterChar", "plateNoRightSide", "plateNoIranNo"],
  INTERNATIONAL_PLATE_ALREADY_EXISTS: ["internationalPlateNo"],
  VIN_ALREADY_EXISTS: ["vin"],
  ENGINE_NO_ALREADY_EXISTS: ["engineNo"],
  CHASSIS_NO_ALREADY_EXISTS: ["chassisNo"],
  MODEL_NOT_FOUND: ["modelId"],
  STATUS_NOT_FOUND: ["vehicleStatusId"],
  VEHICLE_NOT_FOUND: ["vehicleId"],
  POLICY_ALREADY_EXISTS: ["policyNo"]
} as const;

export function useFleetFormState<State>(action: (previous: State, data: FormData) => State | Promise<State>, initial: State) {
  return useEditableActionState(action, initial, errorFields);
}
