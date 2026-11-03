"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { makeWorkOrders } from "../../../composition/work-order.factory";
import { referenceTextFields } from "../../shared/form/maintenance-action-input";
import type { WorkOrderFormState } from "../shared/work-order-form-state";
export async function saveWorkOrderAction(id: number | null, previous: WorkOrderFormState, data: FormData): Promise<WorkOrderFormState> {
  void previous;
  const names = ["workLocation", "workshopId", "odometer", "engineHours", "problem", "diagnosis", "description"];
  const values = referenceTextFields(data, id === null ? [...names, "origin", "sourceId", "vehicleId", "maintenanceTypeId"] : names);
  if (!values) return { unavailable: true };
  const details = { workLocation: values.workLocation, workshopId: values.workshopId === "" ? null : Number(values.workshopId), odometer: values.odometer, engineHours: values.engineHours, problem: values.problem, diagnosis: values.diagnosis, description: values.description };
  let result;
  try {
    const manage = makeWorkOrders();
    result = id === null ? await manage.create({ ...details, origin: values.origin, sourceId: values.sourceId === "" ? null : Number(values.sourceId), vehicleId: Number(values.vehicleId), maintenanceTypeId: Number(values.maintenanceTypeId) }) : await manage.updateDetails(id, details);
  } catch { return { unavailable: true }; }
  if (!result.success) return { error: result.error };
  for (const path of ["/maintenance/work-orders", `/maintenance/work-orders/${result.id}`, `/maintenance/work-orders/${result.id}/edit`, `/maintenance/work-orders/${result.id}/tasks`, `/maintenance/work-orders/${result.id}/parts`, `/maintenance/work-orders/${result.id}/costs`, "/maintenance/requests", "/maintenance/workshops", "/maintenance/catalogs"]) revalidatePath(path);
  revalidatePath("/maintenance/requests/[requestId]", "page");
  redirect(id === null ? "/maintenance/work-orders" : `/maintenance/work-orders/${result.id}`);
}
