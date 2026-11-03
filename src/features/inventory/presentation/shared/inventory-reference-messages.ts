import type { InventoryReferenceField } from "../../application/reference-data/inventory-reference-records";
import type { InventoryReferenceFormState } from "./inventory-reference-form-state";

export function inventoryReferenceFieldErrors(state: InventoryReferenceFormState, field: InventoryReferenceField): string[] {
  if (state.status !== "failed") return [];
  if (state.error.type === "DUPLICATE_CODE" && field === "code") return ["این کد انبار قبلاً ثبت شده است."];
  if (state.error.type === "DUPLICATE_NAME" && field === "name") return ["این نام قبلاً ثبت شده است."];
  if (state.error.type !== "VALIDATION_ERROR") return [];
  const code = state.error.fields[field];
  if (code === "REQUIRED") return ["این فیلد را تکمیل کنید."];
  if (code === "TOO_LONG") return ["متن واردشده بیش از حد مجاز است."];
  return code ? ["مقدار واردشده معتبر نیست."] : [];
}

export function inventoryReferenceStatusMessage(state: InventoryReferenceFormState): string | null {
  if (state.status === "invalid_form") return "اطلاعات فرم معتبر نیست. صفحه را به‌روزرسانی کنید و دوباره تلاش کنید.";
  if (state.status === "unavailable") return "ثبت اطلاعات امکان‌پذیر نبود. لطفاً دوباره تلاش کنید.";
  if (state.status !== "failed") return null;
  if (state.error.type === "NOT_FOUND") return "این مورد دیگر وجود ندارد. فهرست را به‌روزرسانی کنید.";
  if (state.error.type === "UNIT_IN_USE") return "این واحد برای قطعات استفاده شده است و قابل حذف نیست.";
  if (state.error.type === "CATEGORY_IN_USE") return "این دسته‌بندی برای قطعات استفاده شده است و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید.";
  return "اطلاعات مشخص‌شده را اصلاح کنید.";
}
