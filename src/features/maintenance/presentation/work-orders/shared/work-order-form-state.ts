import type { MaintenanceFormState } from "../../shared/form/maintenance-form-state";
import type { WorkOrderFailure } from "../../../application/work-orders/work-order-records";
export type WorkOrderFormState = { error?: WorkOrderFailure; unavailable?: boolean };
export const orderFailureMessages: Record<Exclude<WorkOrderFailure["type"], "VALIDATION_ERROR">, string> = {
  NOT_FOUND: "پروندهٔ تعمیر پیدا نشد. فهرست را به‌روزرسانی کنید.",
  VEHICLE_UNAVAILABLE: "خودروی انتخاب‌شده موجود یا فعال نیست.", TYPE_UNAVAILABLE: "نوع تعمیر و سرویس انتخاب‌شده موجود یا فعال نیست.",
  WORKSHOP_UNAVAILABLE: "تعمیرگاه انتخاب‌شده موجود یا فعال نیست. تعمیرگاه دیگری انتخاب کنید.",
  SOURCE_UNAVAILABLE: "درخواست انتخاب‌شده بسته یا نامشخص است، یا برنامهٔ سرویس موجود و فعال نیست. منشأ دیگری انتخاب کنید.",
  SOURCE_MISMATCH: "خودرو و نوع تعمیر باید با درخواست یا برنامهٔ سرویس انتخاب‌شده یکسان باشند.",
  ORDER_CLOSED: "پروندهٔ تکمیل‌شده یا لغوشده قابل ویرایش نیست.", UNKNOWN_STATUS: "وضعیت یا منشأ پرونده نامشخص است؛ برای بررسی با پشتیبانی تماس بگیرید.",
  NUMBER_CAPACITY: "ظرفیت شمارهٔ پرونده‌های تعمیر امسال تکمیل شده است. با پشتیبانی تماس بگیرید.",
};
export function orderFieldErrors(state: WorkOrderFormState, name: string): string[] {
  const dependencies: Record<string, string[]> = { VEHICLE_UNAVAILABLE: ["vehicleId"], TYPE_UNAVAILABLE: ["maintenanceTypeId"], WORKSHOP_UNAVAILABLE: ["workshopId"], SOURCE_UNAVAILABLE: ["sourceId"], SOURCE_MISMATCH: ["sourceId", "vehicleId", "maintenanceTypeId"] };
  if (state.error && state.error.type !== "VALIDATION_ERROR" && dependencies[state.error.type]?.includes(name)) return [orderFailureMessages[state.error.type]];
  if (state.error?.type !== "VALIDATION_ERROR") return [];
  const fields = state.error.fields;
  const code = fields[name as keyof typeof fields];
  return code ? [code === "REQUIRED" ? "این فیلد را تکمیل کنید." : name === "odometer" || name === "engineHours" ? "مقدار معتبر و غیرمنفی با حداکثر دو رقم اعشار وارد کنید." : "مقدار واردشده معتبر نیست."] : [];
}
export function orderTextFieldState(state: WorkOrderFormState): MaintenanceFormState {
  return state.error?.type === "VALIDATION_ERROR" ? { error: { type: "VALIDATION_ERROR", fields: Object.fromEntries(Object.entries(state.error.fields).filter((entry): entry is [string, "REQUIRED" | "INVALID"] => entry[1] !== undefined)) } } : {};
}
