"use server";

import { revalidatePath } from "next/cache";
import type { InventoryReferenceResult } from "../../application/reference-data/inventory-reference-records";
import { makeManageInventoryReferences } from "../../composition/inventory-reference.factory";
import type { InventoryReferenceFormState } from "../shared/inventory-reference-form-state";

async function finishCatalogWrite(write: () => Promise<InventoryReferenceResult<unknown>>): Promise<InventoryReferenceFormState> {
  try {
    const result = await write();
    if (!result.success) return { status: "failed", error: result.error };
    revalidatePath("/inventory/catalogs");
    return { status: "saved" };
  } catch { return { status: "unavailable" }; }
}

export async function saveInventoryUnitAction(id: number | null, previous: InventoryReferenceFormState, data: FormData): Promise<InventoryReferenceFormState> {
  void previous;
  const name = data.get("name"), symbol = data.get("symbol");
  if (typeof name !== "string" || (symbol !== null && typeof symbol !== "string")) return { status: "invalid_form" };
  return finishCatalogWrite(() => makeManageInventoryReferences().saveUnit({ id, name, symbol }));
}

export async function deleteInventoryUnitAction(id: number, previous: InventoryReferenceFormState, data: FormData): Promise<InventoryReferenceFormState> {
  void previous; void data;
  return finishCatalogWrite(() => makeManageInventoryReferences().deleteUnit(id));
}

export async function deletePartCategoryAction(id: number, previous: InventoryReferenceFormState, data: FormData): Promise<InventoryReferenceFormState> {
  void previous; void data;
  return finishCatalogWrite(() => makeManageInventoryReferences().deleteCategory(id));
}

export async function savePartCategoryAction(id: number | null, previous: InventoryReferenceFormState, data: FormData): Promise<InventoryReferenceFormState> {
  void previous;
  const name = data.get("name"), active = data.get("isActive");
  if (typeof name !== "string" || (id !== null && active !== null && active !== "on")) return { status: "invalid_form" };
  return finishCatalogWrite(() => makeManageInventoryReferences().saveCategory({ id, name, isActive: id === null || active === "on" }));
}
