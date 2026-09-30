"use server";



import { makeManageDrivers } from "../../composition/driver.factory";

import { formValues, parseDateTime, type DriverActionState } from "../driver-form-data";
import { submitDriverAction } from "../driver-action-runner";

export async function assignVehicleAction(driverId: number, _state: DriverActionState, data: FormData) {
  return submitDriverAction(data, v => makeManageDrivers().assignVehicle({ driverId, vehicleId: Number(v.vehicleId), fromDateTime: parseDateTime(v.fromDay, v.fromTime) ?? new Date(NaN), toDateTime: parseDateTime(v.toDay, v.toTime), startOdometer: v.startOdometer?.trim() || null, endOdometer: v.endOdometer?.trim() || null, description: v.description ?? null }), () => `/drivers/${driverId}?tab=assignments`);
}

export async function updateAssignmentAction(driverId: number, assignmentId: number, _state: DriverActionState, data: FormData) {
  return submitDriverAction(data, v => makeManageDrivers().updateAssignment({ assignmentId, driverId, vehicleId: Number(v.vehicleId), fromDateTime: parseDateTime(v.fromDay, v.fromTime) ?? new Date(NaN), toDateTime: parseDateTime(v.toDay, v.toTime), startOdometer: v.startOdometer?.trim() || null, endOdometer: v.endOdometer?.trim() || null, description: v.description ?? null }), () => `/drivers/${driverId}?tab=assignments`);
}

export async function closeAssignmentAction(driverId: number, assignmentId: number, _state: DriverActionState, data: FormData) {
  return submitDriverAction(data, v => makeManageDrivers().closeAssignment(assignmentId, parseDateTime(v.toDay, v.toTime) ?? new Date(NaN), v.endOdometer?.trim() || null, driverId), () => `/drivers/${driverId}?tab=assignments`);
}

export async function deleteAssignmentAction(driverId: number, assignmentId: number, _state: DriverActionState, data: FormData) {
  const values = formValues(data);
  if (!values) return { error: "INVALID_FORM" } satisfies DriverActionState;
  return submitDriverAction(data, () => makeManageDrivers().deleteAssignment(driverId, assignmentId), () => `/drivers/${driverId}?tab=assignments`);
}
