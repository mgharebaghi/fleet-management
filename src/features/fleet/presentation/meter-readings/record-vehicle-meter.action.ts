"use server";
import { revalidatePath } from "next/cache";
import { makeRecordVehicleMeter } from "../../composition/meter-readings/vehicle-meter.factory";
import { parseTehranDateTime } from "../../../../shared/presentation/tehran-date-time";
import type { VehicleMeterFormState } from "./vehicle-meter-form-state";
export async function recordVehicleMeterAction(vehicleId: number, previous: VehicleMeterFormState, data: FormData): Promise<VehicleMeterFormState> {
  void previous;
  const fields: Record<string, string> = {};
  for (const name of ["readingDay", "readingTime", "odometer", "engineHours", "description"]) {
    const entries = data.getAll(name);
    if (entries.length !== 1 || typeof entries[0] !== "string") return { unavailable: true };
    fields[name] = entries[0];
  }
  try {
    const result = await makeRecordVehicleMeter().execute({ vehicleId, recordedAt: parseTehranDateTime(fields.readingDay, fields.readingTime), odometer: fields.odometer, engineHours: fields.engineHours, description: fields.description });
    if (!result.success) return { error: result.error };
    for (const path of ["/fleet/vehicles", `/fleet/vehicles/${vehicleId}`, `/fleet/vehicles/${vehicleId}/edit`, `/fleet/vehicles/${vehicleId}/meter-readings`]) revalidatePath(path);
    for (const suffix of ["", "/tasks", "/parts", "/costs"]) revalidatePath(`/maintenance/work-orders/[orderId]${suffix}`, "page");
    revalidatePath("/maintenance/plans");
    revalidatePath("/maintenance/plans/[planId]", "page");
    revalidatePath("/maintenance/plans/[planId]/edit", "page");
    return { saved: true };
  } catch { return { unavailable: true }; }
}
