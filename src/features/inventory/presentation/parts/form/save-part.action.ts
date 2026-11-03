"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PartFailure } from "../../../application/parts/part-records";
import { makeManageParts } from "../../../composition/part.factory";
export type PartFormState = { error?: PartFailure; formError?: boolean };
export async function savePartAction(id: number | null, previous: PartFormState, data: FormData): Promise<PartFormState> {
  void previous;
  const names = ["code", "name", "unitId", "categoryId", "partNumber", "manufacturer", "minStock", "maxStock", "reorderPoint"] as const;
  const values: Record<string, string> = {};
  for (const field of names) {
    const value = data.get(field);
    if (typeof value !== "string") return { formError: true };
    values[field] = value;
  }
  const active = data.get("isActive");
  if (id !== null && active !== null && active !== "on") return { formError: true };
  let result;
  try { result = await makeManageParts().save({ id, code: values.code, name: values.name, unitId: Number(values.unitId), categoryId: values.categoryId === "" ? null : Number(values.categoryId), partNumber: values.partNumber, manufacturer: values.manufacturer, minStock: values.minStock, maxStock: values.maxStock, reorderPoint: values.reorderPoint, isActive: id === null || active === "on" }); }
  catch { return { formError: true }; }
  if (!result.success) return { error: result.error };
  revalidatePath("/inventory/parts");
  revalidatePath(`/inventory/parts/${result.id}`);
  revalidatePath(`/inventory/parts/${result.id}/edit`);
  redirect(`/inventory/parts/${result.id}`);
}
