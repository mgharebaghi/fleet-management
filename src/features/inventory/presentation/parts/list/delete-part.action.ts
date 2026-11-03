"use server";

import { revalidatePath } from "next/cache";
import { makeManageParts } from "../../../composition/part.factory";

export type DeletePartState = { saved?: boolean; message?: string };

export async function deletePartAction(id: number, previous: DeletePartState, data: FormData): Promise<DeletePartState> {
  void previous; void data;
  try {
    const result = await makeManageParts().delete(id);
    if (!result.success) return { message: result.error.type === "PART_IN_USE"
      ? "این قطعه سابقه یا وابستگی دارد و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید."
      : "قطعه پیدا نشد یا اطلاعات درخواست معتبر نیست. فهرست را به‌روزرسانی کنید." };
    revalidatePath("/inventory/parts");
    revalidatePath(`/inventory/parts/${id}`);
    return { saved: true };
  } catch { return { message: "حذف قطعه امکان‌پذیر نبود. لطفاً دوباره تلاش کنید." }; }
}
