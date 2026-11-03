"use server";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { referenceTextFields, referenceCheckbox } from "../shared/form/maintenance-action-input";
import { finishMaintenanceSave } from "../shared/form/maintenance-save-result";
import type { MaintenanceFormState } from "../shared/form/maintenance-form-state";
export async function saveMaintenanceTypeAction(id: number | null, previous: MaintenanceFormState, data: FormData): Promise<MaintenanceFormState> {
  void previous;
  const fields = referenceTextFields(data, ["code", "name", "description"]), active = referenceCheckbox(data, "isActive");
  if (!fields || active === null) return { unavailable: true };
  let result;
  try { result = await makeMaintenanceReferences().saveType({ id, code: fields.code, name: fields.name, description: fields.description, isActive: id === null || active }); }
  catch { return { unavailable: true }; }
  return finishMaintenanceSave(result, "/maintenance/catalogs");
}
