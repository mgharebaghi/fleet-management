import type { RequestFailure } from "../../../application/requests/maintenance-request-records";
export type RequestFormState = { error?: RequestFailure; unavailable?: boolean; saved?: boolean };
export const requestFailureMessages: Record<Exclude<RequestFailure["type"], "VALIDATION_ERROR">, string> = {
  REQUEST_IN_USE: "این درخواست پروندهٔ تعمیر دارد و قابل تغییر یا حذف نیست؛ رسیدگی را از پروندهٔ مرتبط ادامه دهید.",
  NOT_FOUND: "درخواست پیدا نشد. فهرست را به‌روزرسانی کنید.", VEHICLE_UNAVAILABLE: "خودروی انتخاب‌شده موجود یا فعال نیست.", TYPE_UNAVAILABLE: "نوع تعمیر و سرویس انتخاب‌شده موجود یا فعال نیست.",
  REQUEST_CLOSED: "این درخواست بسته یا لغو شده و قابل تغییر نیست.", ORIGIN_FIXED: "برای این درخواست پروندهٔ تعمیر ثبت شده است؛ خودرو و نوع تعمیر آن قابل تغییر نیست.",
  ORDERS_UNRESOLVED: "ابتدا تمام پرونده‌های تعمیر مرتبط را تکمیل یا لغو کنید؛ درخواست هنوز قابل بستن یا لغو نیست.", INVALID_TRANSITION: "این تغییر وضعیت برای درخواست مجاز نیست.", UNKNOWN_STATUS: "وضعیت ذخیره‌شدهٔ درخواست شناخته‌شده نیست؛ برای بررسی با پشتیبانی تماس بگیرید.",
};
export function requestFieldErrors(state: RequestFormState, field: string): string[] {
  if (state.error?.type === "VEHICLE_UNAVAILABLE" && field === "vehicleId") return [requestFailureMessages.VEHICLE_UNAVAILABLE];
  if (state.error?.type === "TYPE_UNAVAILABLE" && field === "maintenanceTypeId") return [requestFailureMessages.TYPE_UNAVAILABLE];
  if (state.error?.type !== "VALIDATION_ERROR") return [];
  const fields = state.error.fields;
  const code = fields[field as keyof typeof fields];
  return code ? [code === "REQUIRED" ? "این فیلد را تکمیل کنید." : code === "TOO_LONG" ? "متن واردشده بیش از حد مجاز است." : "مقدار معتبر و غیرمنفی با حداکثر دو رقم اعشار وارد کنید."] : [];
}
