"use server";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { referenceTextFields, referenceCheckbox } from "../shared/form/maintenance-action-input";
import { finishMaintenanceSave } from "../shared/form/maintenance-save-result";
import type { MaintenanceFormState } from "../shared/form/maintenance-form-state";
export async function saveTechnicianAction(id: number | null, previous: MaintenanceFormState, data: FormData): Promise<MaintenanceFormState> {
  void previous;
  const fields = referenceTextFields(data, ["firstName", "lastName", "workshopId", "mobile", "specialty", "description"]), active = referenceCheckbox(data, "isActive");
  if (!fields || active === null) return { unavailable: true };
  let result;
  try { result = await makeMaintenanceReferences().saveTechnician({ id, firstName: fields.firstName, lastName: fields.lastName, workshopId: fields.workshopId ? Number(fields.workshopId) : null, mobile: fields.mobile, specialty: fields.specialty, description: fields.description, isActive: id === null || active }); }
  catch { return { unavailable: true }; }
  return finishMaintenanceSave(result, "/maintenance/technicians");
}
