import type { InventoryReferenceFailure } from "../../application/reference-data/inventory-reference-records";

export type InventoryReferenceFormState =
  | { status: "idle" | "saved" | "invalid_form" | "unavailable" }
  | { status: "failed"; error: InventoryReferenceFailure };

export const initialInventoryReferenceFormState: InventoryReferenceFormState = { status: "idle" };
