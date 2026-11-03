"use server";
import { revalidatePath } from "next/cache";
import { makeMaintenanceReferences } from "../../composition/maintenance-reference.factory";
import { referenceFailureMessages } from "../shared/form/maintenance-form-state";
export type DeleteMaintenanceTypeState = { saved?: boolean; message?: string };
export async function deleteMaintenanceTypeAction(id: number, previous: DeleteMaintenanceTypeState, data: FormData): Promise<DeleteMaintenanceTypeState> {
  void previous; void data;
  try {
    const result = await makeMaintenanceReferences().deleteType(id);
    if (!result.success) return { message: result.error.type === "VALIDATION_ERROR" ? "اطلاعات درخواست معتبر نیست. فهرست را به‌روزرسانی کنید." : referenceFailureMessages[result.error.type] };
    for (const path of ["/maintenance/catalogs", `/maintenance/catalogs/${id}`, `/maintenance/catalogs/${id}/edit`]) revalidatePath(path);
    return { saved: true };
  } catch { return { message: "حذف نوع تعمیر و سرویس امکان‌پذیر نبود. لطفاً دوباره تلاش کنید." }; }
}
