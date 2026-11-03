"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageInventoryReferences } from "../../../composition/inventory-reference.factory";
import type { InventoryReferenceFormState } from "../../shared/inventory-reference-form-state";

export async function saveWarehouseAction(
  id: number | null,
  previous: InventoryReferenceFormState,
  data: FormData,
): Promise<InventoryReferenceFormState> {
  void previous;
  const code = data.get("code");
  const name = data.get("name");
  const location = data.get("location");
  const active = data.get("isActive");
  if (
    typeof code !== "string" || typeof name !== "string" ||
    (location !== null && typeof location !== "string") ||
    (id !== null && active !== null && active !== "on")
  ) return { status: "invalid_form" };

  let result;
  try {
    result = await makeManageInventoryReferences().saveWarehouse({
      id, code, name, location, isActive: id === null || active === "on",
    });
  } catch { return { status: "unavailable" }; }
  if (!result.success) return { status: "failed", error: result.error };

  revalidatePath("/inventory/warehouses");
  revalidatePath(`/inventory/warehouses/${result.value.id}`);
  revalidatePath(`/inventory/warehouses/${result.value.id}/edit`);
  redirect(`/inventory/warehouses/${result.value.id}`);
}
