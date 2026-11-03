"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeServicePlans } from "../../composition/service-plans/service-plan.factory";
import { referenceCheckbox, referenceTextFields } from "../shared/form/maintenance-action-input";
import type { PlanFormState } from "./service-plan-presentation";
export async function saveServicePlanAction(id: number | null, previous: PlanFormState, data: FormData): Promise<PlanFormState> {
  void previous;
  const values = referenceTextFields(data, ["vehicleId", "maintenanceTypeId", "title", "description", "intervalKm", "intervalDays", "intervalHours", "warningKm", "warningDays", "warningHours", "lastOdometer", "lastDate", "lastHours"]);
  const active = referenceCheckbox(data, "isActive");
  if (!values || active === null) return { unavailable: true };
  const fields: Partial<Record<"intervalKm" | "intervalDays" | "intervalHours", "REQUIRED">> = {};
  for (const [name, interval, warning] of [["useKm", "intervalKm", "warningKm"], ["useDays", "intervalDays", "warningDays"], ["useHours", "intervalHours", "warningHours"]] as const) {
    const selected = referenceCheckbox(data, name);
    if (selected === null) return { unavailable: true };
    if (!selected) { values[interval] = ""; values[warning] = ""; }
    else if (!values[interval].trim()) fields[interval] = "REQUIRED";
  }
  if (Object.keys(fields).length) return { error: { type: "VALIDATION_ERROR", fields } };
  let result;
  try { result = await makeServicePlans().save({ id, vehicleId: Number(values.vehicleId), maintenanceTypeId: Number(values.maintenanceTypeId), title: values.title, description: values.description, isActive: active, intervalKm: values.intervalKm, intervalDays: values.intervalDays, intervalHours: values.intervalHours, warningKm: values.warningKm, warningDays: values.warningDays, warningHours: values.warningHours, lastOdometer: values.lastOdometer, lastDate: values.lastDate, lastHours: values.lastHours }); }
  catch { return { unavailable: true }; }
  if (!result.success) return { error: result.error };
  for (const path of ["/maintenance/plans", `/maintenance/plans/${result.id}`, `/maintenance/plans/${result.id}/edit`, "/maintenance/work-orders/create"]) revalidatePath(path);
  redirect(id === null ? "/maintenance/plans" : `/maintenance/plans/${result.id}`);
}
