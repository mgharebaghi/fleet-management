"use server";
import { revalidatePath } from "next/cache";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { referenceTextFields, referenceCheckbox } from "../shared/form/maintenance-action-input";
import { finishMaintenanceSave } from "../shared/form/maintenance-save-result";
import type { MaintenanceFormState } from "../shared/form/maintenance-form-state";
async function saveType(id: number | null, data: FormData) {
  const fields = referenceTextFields(data, ["code", "name", "description"]), active = referenceCheckbox(data, "isActive");
  if (!fields || active === null) return null;
  try { return await makeMaintenanceReferences().saveType({ id, code: fields.code, name: fields.name, description: fields.description, isActive: id === null || active }); }
  catch { return null; }
}

export async function saveMaintenanceTypeAction(id: number | null, previous: MaintenanceFormState, data: FormData): Promise<MaintenanceFormState> {
  void previous;
  const result = await saveType(id, data);
  if (!result) return { unavailable: true };
  if (result.success) revalidatePath("/maintenance/catalogs/types");
  return finishMaintenanceSave(result, "/maintenance/catalogs");
}

export async function saveMaintenanceTypeFromCatalogAction(id: number | null, previous: MaintenanceFormState, data: FormData): Promise<MaintenanceFormState & { saved?: true }> {
  void previous;
  const result = await saveType(id, data);
  if (!result) return { unavailable: true };
  if (!result.success) return { error: result.error };
  revalidatePath("/maintenance/catalogs");
  revalidatePath("/maintenance/catalogs/types");
  revalidatePath(`/maintenance/catalogs/${result.value.id}`);
  revalidatePath(`/maintenance/catalogs/${result.value.id}/edit`);
  return { saved: true };
}
