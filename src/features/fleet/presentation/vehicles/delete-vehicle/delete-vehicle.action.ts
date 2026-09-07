"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeDeleteVehicle } from "../../../composition/vehicles/vehicle.factory";
import type { DeleteVehicleActionState } from "./delete-vehicle.action-state";
import { parseDeleteVehicleFormData } from "./delete-vehicle.form-data";

export async function deleteVehicleAction(
  previousState: DeleteVehicleActionState,
  formData: FormData,
): Promise<DeleteVehicleActionState> {
  void previousState;

  const parsedFormData = parseDeleteVehicleFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeDeleteVehicle().execute(parsedFormData.vehicleId);

  if (result.success) {
    revalidatePath("/fleet/vehicles");
    redirect("/fleet/vehicles");
  }

  if (result.error.type === "NOT_FOUND") {
    revalidatePath("/fleet/vehicles");
    redirect("/fleet/vehicles");
  }

  switch (result.error.type) {
    case "IN_USE":
      return { status: "in_use" };
    default: {
      const unhandledError: never = result.error;
      throw new Error(`Unhandled DeleteVehicle error: ${JSON.stringify(unhandledError)}`);
    }
  }
}
