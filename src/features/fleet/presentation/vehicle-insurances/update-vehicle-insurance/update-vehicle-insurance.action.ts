"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeUpdateVehicleInsurance } from "../../../composition/vehicle-insurances/vehicle-insurance.factory";
import type { UpdateVehicleInsuranceActionState } from "./update-vehicle-insurance.action-state";
import { parseUpdateInsuranceFormData } from "./update-vehicle-insurance.form-data";

export async function updateVehicleInsuranceAction(
  previous: UpdateVehicleInsuranceActionState,
  data: FormData,
): Promise<UpdateVehicleInsuranceActionState> {
  void previous;

  const parsed = parseUpdateInsuranceFormData(data);
  if (!parsed.success) return { formError: "invalid_form" };

  let result;
  try {
    result = await makeUpdateVehicleInsurance().execute(parsed.input);
  } catch {
    return { formError: "unavailable", values: parsed.values };
  }

  if (!result.success) {
    if (result.error.type === "NOT_FOUND") {
      return { formError: "not_found", values: parsed.values };
    }
    return { error: result.error, values: parsed.values };
  }

  revalidatePath("/fleet/vehicle-insurances");
  redirect("/fleet/vehicle-insurances");
}
