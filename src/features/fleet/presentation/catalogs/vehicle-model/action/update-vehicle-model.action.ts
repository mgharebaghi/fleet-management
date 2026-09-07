"use server";

import { revalidatePath } from "next/cache";

import { makeUpdateVehicleModel } from "../../../../composition/catalogs/vehicle-model.factory";
import type { UpdateVehicleModelActionState } from "../update-vehicle-model.action-state";
import { parseUpdateVehicleModelFormData } from "../update-vehicle-model.form-data";

export async function updateVehicleModelAction(
  previousState: UpdateVehicleModelActionState,
  formData: FormData,
): Promise<UpdateVehicleModelActionState> {
  void previousState;

  const parsedFormData = parseUpdateVehicleModelFormData(formData);
  if (!parsedFormData.success) {
    return { status: parsedFormData.reason };
  }

  const result = await makeUpdateVehicleModel().execute(parsedFormData.input);

  if (result.success) {
    revalidatePath("/fleet/catalogs");
    return { status: "idle" };
  }

  switch (result.error.type) {
    case "VALIDATION_ERROR":
      return {
        status: "validation_error",
        fieldErrors: result.error.fieldErrors,
      };
    case "BRAND_NOT_FOUND":
      return { status: "brand_not_found" };
    case "VEHICLE_TYPE_NOT_FOUND":
      return { status: "vehicle_type_not_found" };
    case "FUEL_TYPE_NOT_FOUND":
      return { status: "fuel_type_not_found" };
    case "NOT_FOUND":
      revalidatePath("/fleet/catalogs");
      return { status: "not_found" };
    default: {
      const unhandledError: never = result.error;
      throw new Error(
        `Unhandled UpdateVehicleModel error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
