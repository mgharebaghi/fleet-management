import { VEHICLE_MODEL_NAME_MAX_LENGTH } from "../vehicle-model";
import type {
  UpdateVehicleModelInput,
  UpdateVehicleModelValidationError,
  UpdateVehicleModelValidationErrorCode,
} from "./update-vehicle-model.contract";

export function normalizeUpdateVehicleModelInput(
  input: UpdateVehicleModelInput,
): UpdateVehicleModelInput {
  return { ...input, name: input.name.trim() };
}

export function validateUpdateVehicleModelInput(
  input: UpdateVehicleModelInput,
): UpdateVehicleModelValidationError | null {
  const nameErrors: UpdateVehicleModelValidationErrorCode[] = [];

  if (input.name.length === 0) {
    nameErrors.push("REQUIRED");
  } else if (input.name.length > VEHICLE_MODEL_NAME_MAX_LENGTH) {
    nameErrors.push("TOO_LONG");
  }

  if (nameErrors.length === 0) {
    return null;
  }

  return { type: "VALIDATION_ERROR", fieldErrors: { name: nameErrors } };
}
