"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeManageStock } from "../../../composition/stock.factory";
import type { StockFailure } from "../../../application/stock/stock-records";
export type StockFormState = { error?: StockFailure; unavailable?: boolean; values?: Record<string, string> };
export async function appendStockAction(previous: StockFormState, data: FormData): Promise<StockFormState> {
  void previous;
  const values: Record<string, string> = {};
  for (const field of ["warehouseId", "partId", "type", "quantity", "unitPrice", "description"]) {
    const entries = data.getAll(field);
    if (entries.length !== 1 || typeof entries[0] !== "string") return { unavailable: true };
    values[field] = entries[0];
  }
  let result;
  try { result = await makeManageStock().append({ warehouseId: Number(values.warehouseId), partId: Number(values.partId), type: values.type, quantity: values.quantity, unitPrice: values.unitPrice || null, description: values.description || null }); }
  catch { return { unavailable: true, values }; }
  if (!result.success) return { error: result.error, values };
  for (const path of ["/inventory/stock", "/inventory/movements", `/inventory/parts/${values.partId}`, `/inventory/warehouses/${values.warehouseId}`]) revalidatePath(path);
  redirect(`/inventory/movements?partId=${values.partId}&warehouseId=${values.warehouseId}&recorded=${result.id}`);
}
