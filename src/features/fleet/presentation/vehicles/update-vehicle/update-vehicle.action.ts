"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeUpdateVehicle } from "../../../composition/vehicles/vehicle.factory";
import { parseUpdateVehicleFormData } from "./update-vehicle.form-data";
import type { UpdateVehicleActionState } from "./update-vehicle.action-state";

export async function updateVehicleAction(
  previous: UpdateVehicleActionState,
  data: FormData,
): Promise<UpdateVehicleActionState> {
  void previous;
  const parsed = parseUpdateVehicleFormData(data);
  if (!parsed.success) return { formError: "invalid_form" };

  let result;
  try {
    result = await makeUpdateVehicle().execute(parsed.input);
  } catch {
    return { formError: "unavailable", values: parsed.values };
  }

  if (!result.success) {
    if (result.error.type === "NOT_FOUND") {
      return { formError: "not_found", values: parsed.values };
    }
    return { error: result.error, values: parsed.values };
  }

  revalidatePath("/fleet/vehicles");
  revalidatePath(`/fleet/vehicles/${parsed.input.vehicleId}`);
  redirect(`/fleet/vehicles/${parsed.input.vehicleId}`);
}
