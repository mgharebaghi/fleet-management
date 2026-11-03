"use client";
import { useEditableActionState } from "../../../../../shared/presentation/use-editable-action-state";
import type { MaintenanceFormState } from "./maintenance-form-state";
export function useMaintenanceFormState(action: (previous: MaintenanceFormState, data: FormData) => Promise<MaintenanceFormState>) {
  return useEditableActionState(action, {} as MaintenanceFormState, { DUPLICATE_CODE: ["code"], WORKSHOP_UNAVAILABLE: ["workshopId"] });
}
