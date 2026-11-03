"use server";

import { revalidatePath } from "next/cache";
import { makeManageInventoryReferences } from "../../../composition/inventory-reference.factory";

export type WarehouseRowState = { saved?: boolean; message?: string };

export async function deleteWarehouseAction(id: number, previous: WarehouseRowState, data: FormData): Promise<WarehouseRowState> {
  void previous; void data;
  try {
    const result = await makeManageInventoryReferences().deleteWarehouse(id);
    if (!result.success) return { message: result.error.type === "WAREHOUSE_IN_USE"
      ? "این انبار سابقهٔ گردش دارد و قابل حذف نیست؛ در صورت نیاز آن را غیرفعال کنید."
      : "انبار پیدا نشد یا درخواست معتبر نیست. فهرست را به‌روزرسانی کنید." };
    refreshWarehouseViews(id);
    return { saved: true };
  } catch { return { message: "حذف انبار امکان‌پذیر نبود. لطفاً دوباره تلاش کنید." }; }
}

export async function setWarehouseActiveAction(id: number, isActive: boolean, previous: WarehouseRowState, data: FormData): Promise<WarehouseRowState> {
  void previous; void data;
  try {
    const result = await makeManageInventoryReferences().setWarehouseActive(id, isActive);
    if (!result.success) return { message: "انبار پیدا نشد یا درخواست معتبر نیست. فهرست را به‌روزرسانی کنید." };
    refreshWarehouseViews(id);
    return { saved: true };
  } catch { return { message: "تغییر وضعیت انبار امکان‌پذیر نبود. لطفاً دوباره تلاش کنید." }; }
}

function refreshWarehouseViews(id: number) {
  for (const path of ["/inventory/warehouses", `/inventory/warehouses/${id}`, `/inventory/warehouses/${id}/edit`, "/inventory/stock", "/inventory/movements", "/inventory/movements/create"]) revalidatePath(path);
}
