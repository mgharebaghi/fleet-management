"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeCreateVehicleInsurance } from "../../../composition/vehicle-insurances/vehicle-insurance.factory";
import type { CreateVehicleInsuranceActionState } from "./create-vehicle-insurance.action-state";
import { parseInsuranceFormData } from "./create-vehicle-insurance.form-data";

export async function createVehicleInsuranceAction(_previous: CreateVehicleInsuranceActionState, data: FormData): Promise<CreateVehicleInsuranceActionState> {
  const parsed = parseInsuranceFormData(data);
  if (!parsed.success) return { formError: "invalid_form" };
  let result;
  try { result = await makeCreateVehicleInsurance().execute(parsed.input); }
  catch { return { formError: "unavailable", values: parsed.values }; }
  if (!result.success) return { error: result.error, values: parsed.values };
  revalidatePath("/fleet/vehicle-insurances");
  redirect("/fleet/vehicle-insurances");
}
