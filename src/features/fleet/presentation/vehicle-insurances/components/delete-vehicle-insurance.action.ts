"use server";

import { revalidatePath } from "next/cache";

import { makeDeleteVehicleInsurance } from "../../../composition/vehicle-insurances/vehicle-insurance.factory";
import type { DeleteVehicleInsuranceActionState } from "./delete-vehicle-insurance.action-state";
import { parseDeleteVehicleInsuranceFormData } from "./delete-vehicle-insurance.form-data";

export async function deleteVehicleInsuranceAction(
  previousState: DeleteVehicleInsuranceActionState,
  formData: FormData,
): Promise<DeleteVehicleInsuranceActionState> {
  void previousState;

  const parsedFormData = parseDeleteVehicleInsuranceFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeDeleteVehicleInsurance().execute(
    parsedFormData.vehicleInsuranceId,
  );

  if (result.success) {
    revalidatePath("/fleet/vehicle-insurances");
    return { status: "idle" };
  }

  // DeleteVehicleInsuranceError has exactly one member today: NOT_FOUND.
  revalidatePath("/fleet/vehicle-insurances");
  return { status: "not_found" };
}
