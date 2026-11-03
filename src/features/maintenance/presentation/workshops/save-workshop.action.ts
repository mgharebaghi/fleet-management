"use server";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { referenceTextFields, referenceCheckbox } from "../shared/form/maintenance-action-input";
import { finishMaintenanceSave } from "../shared/form/maintenance-save-result";
import type { MaintenanceFormState } from "../shared/form/maintenance-form-state";
export async function saveWorkshopAction(id: number | null, previous: MaintenanceFormState, data: FormData): Promise<MaintenanceFormState> {
  void previous;
  const fields = referenceTextFields(data, ["name", "workshopType", "address", "phone", "contactPerson", "description"]), active = referenceCheckbox(data, "isActive"), internal = referenceCheckbox(data, "isInternal");
  if (!fields || active === null || internal === null) return { unavailable: true };
  let result;
  try { result = await makeMaintenanceReferences().saveWorkshop({ id, name: fields.name, workshopType: fields.workshopType, address: fields.address, phone: fields.phone, contactPerson: fields.contactPerson, description: fields.description, isInternal: internal, isActive: id === null || active }); }
  catch { return { unavailable: true }; }
  return finishMaintenanceSave(result, "/maintenance/workshops");
}
