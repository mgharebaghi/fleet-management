"use client";

import { useEditableActionState } from "../../../shared/presentation/use-editable-action-state";

const errorFields = {
  OPENING_EXISTS: ["type", "warehouseId", "partId"],
  INSUFFICIENT_STOCK: ["quantity", "warehouseId", "partId"],
  REFERENCE_UNAVAILABLE: ["warehouseId", "partId"],
  INVALID_LEDGER: ["warehouseId", "partId"],
  DUPLICATE_CODE: ["code"],
  DUPLICATE_NAME: ["name"],
  UNIT_NOT_FOUND: ["unitId"],
  CATEGORY_UNAVAILABLE: ["categoryId"]
} as const;

export function useInventoryFormState<State>(action: (previous: State, data: FormData) => State | Promise<State>, initial: State) {
  return useEditableActionState(action, initial, errorFields);
}
