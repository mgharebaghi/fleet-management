"use server";

import { revalidatePath } from "next/cache";

import { makeCreateVehicleModel } from "../../../../composition/catalogs/vehicle-model.factory";
import type { CreateVehicleModelActionState } from "../create-vehicle-model.action-state";
import { parseCreateVehicleModelFormData } from "../create-vehicle-model.form-data";

export async function createVehicleModelAction(
  previousState: CreateVehicleModelActionState,
  formData: FormData,
): Promise<CreateVehicleModelActionState> {
  void previousState;

  const parsedFormData = parseCreateVehicleModelFormData(formData);
  if (!parsedFormData.success) {
    return { status: parsedFormData.reason };
  }

  const result = await makeCreateVehicleModel().execute(parsedFormData.input);

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
    default: {
      const unhandledError: never = result.error;
      throw new Error(
        `Unhandled CreateVehicleModel error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
