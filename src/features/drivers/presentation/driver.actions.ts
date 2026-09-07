"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageDrivers } from "../composition/driver.factory";
import type { DriverResult } from "../application/driver-records";
import { formValues, parseDate, parseDateTime, type DriverActionState } from "./driver-form-data";

async function submit(data: FormData, work: (values: Record<string, string>) => Promise<DriverResult>, href: (id: number) => string): Promise<DriverActionState> {
  const values = formValues(data);
  if (!values) return { error: "INVALID_FORM" };
  let result: DriverResult;
  try { result = await work(values); } catch { return { error: "UNEXPECTED", values }; }
  if (!result.success) return { error: result.error, values };
  revalidatePath("/drivers", "layout");
  redirect(href(result.id));
}
export async function defineDriverAction(_state: DriverActionState, data: FormData) {
  return submit(data, v => makeManageDrivers().defineDriver(Number(v.personId)), id => `/drivers/${id}`);
}
export async function addLicenseAction(driverId: number, _state: DriverActionState, data: FormData) {
  return submit(data, v => makeManageDrivers().addLicense({ driverId, licenseType: v.licenseType ?? "", licenseNo: v.licenseNo ?? "", issueDate: parseDate(v.issueDate), expireDate: parseDate(v.expireDate), isActive: v.isActive === "true" }), () => `/drivers/${driverId}`);
}
export async function assignVehicleAction(driverId: number, _state: DriverActionState, data: FormData) {
  return submit(data, v => makeManageDrivers().assignVehicle({ driverId, vehicleId: Number(v.vehicleId), fromDateTime: parseDateTime(v.fromDay, v.fromTime) ?? new Date(NaN), toDateTime: parseDateTime(v.toDay, v.toTime), startOdometer: v.startOdometer?.trim() || null, endOdometer: v.endOdometer?.trim() || null, description: v.description ?? null }), () => `/drivers/${driverId}`);
}
export async function closeAssignmentAction(driverId: number, assignmentId: number, _state: DriverActionState, data: FormData) {
  return submit(data, v => makeManageDrivers().closeAssignment(assignmentId, parseDateTime(v.toDay, v.toTime) ?? new Date(NaN), v.endOdometer?.trim() || null), () => `/drivers/${driverId}`);
}
