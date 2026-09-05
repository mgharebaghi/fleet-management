"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeCreateVehicle } from "../../../composition/vehicles/vehicle.factory";
import { parseVehicleFormData } from "./create-vehicle.form-data";
import type { CreateVehicleActionState } from "./create-vehicle.action-state";
export async function createVehicleAction(previous: CreateVehicleActionState, data: FormData): Promise<CreateVehicleActionState> {
  void previous;
  const parsed = parseVehicleFormData(data);
  if (!parsed.success) return { formError: "invalid_form" };
  let result;
  try { result = await makeCreateVehicle().execute(parsed.input); }
  catch { return { formError: "unavailable", values: parsed.values }; }
  if (!result.success) return { error: result.error, values: parsed.values };
  revalidatePath("/fleet/vehicles");
  redirect("/fleet/vehicles");
}
