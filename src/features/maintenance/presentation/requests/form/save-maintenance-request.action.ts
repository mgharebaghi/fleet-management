"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeMaintenanceRequests } from "../../../composition/maintenance-request.factory";
import { referenceTextFields } from "../../shared/form/maintenance-action-input";
import type { RequestFormState } from "../shared/request-form-state";
export async function saveMaintenanceRequestAction(id: number | null, previous: RequestFormState, data: FormData): Promise<RequestFormState> {
  void previous;
  const values = referenceTextFields(data, ["vehicleId", "maintenanceTypeId", "problem", "reportedOdometer", "reportedEngineHours", "priority", "description"]);
  if (!values) return { unavailable: true };
  let result;
  try { result = await makeMaintenanceRequests().save({ id, vehicleId: Number(values.vehicleId), maintenanceTypeId: Number(values.maintenanceTypeId), problem: values.problem, reportedOdometer: values.reportedOdometer, reportedEngineHours: values.reportedEngineHours, priority: values.priority, description: values.description }); }
  catch { return { unavailable: true }; }
  if (!result.success) return { error: result.error };
  revalidatePath("/maintenance/requests"); revalidatePath("/maintenance/catalogs"); revalidatePath(`/maintenance/requests/${result.id}`); revalidatePath(`/maintenance/requests/${result.id}/edit`);
  redirect(id === null ? "/maintenance/requests" : `/maintenance/requests/${result.id}`);
}
