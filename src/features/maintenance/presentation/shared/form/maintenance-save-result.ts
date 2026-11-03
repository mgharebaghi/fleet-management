import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReferenceResult } from "../../../application/reference-data/maintenance-reference-records";
import type { MaintenanceFormState } from "./maintenance-form-state";
export function finishMaintenanceSave(result: ReferenceResult<{ id: number }>, path: string): MaintenanceFormState {
  if (!result.success) return { error: result.error };
  for (const route of ["/maintenance/catalogs", "/maintenance/workshops", "/maintenance/technicians", "/maintenance/technicians/create", `${path}/${result.value.id}`, `${path}/${result.value.id}/edit`]) revalidatePath(route);
  redirect(`${path}/${result.value.id}`);
}
