import { VEHICLE_MODEL_NAME_MAX_LENGTH } from "../vehicle-model";
import type {
  CreateVehicleModelInput,
  CreateVehicleModelValidationError,
  CreateVehicleModelValidationErrorCode,
} from "./create-vehicle-model.contract";

export function normalizeCreateVehicleModelInput(
  input: CreateVehicleModelInput,
): CreateVehicleModelInput {
  return { ...input, name: input.name.trim() };
}

export function validateCreateVehicleModelInput(
  input: CreateVehicleModelInput,
): CreateVehicleModelValidationError | null {
  const nameErrors: CreateVehicleModelValidationErrorCode[] = [];

  if (input.name.length === 0) {
    nameErrors.push("REQUIRED");
  } else if (input.name.length > VEHICLE_MODEL_NAME_MAX_LENGTH) {
    nameErrors.push("TOO_LONG");
  }

  if (nameErrors.length === 0) {
    return null;
  }

  return {
    type: "VALIDATION_ERROR",
    fieldErrors: { name: nameErrors },
  };
}
