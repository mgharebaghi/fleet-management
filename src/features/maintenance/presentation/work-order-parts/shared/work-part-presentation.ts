import type { WorkPartFailure } from "../../../application/work-order-parts/work-order-part-records";
export type WorkPartFormState = { saved?: boolean; error?: WorkPartFailure; unavailable?: boolean };
export const workPartMessages: Record<Exclude<WorkPartFailure["type"], "VALIDATION_ERROR">, string> = {
  NOT_FOUND: "پروندهٔ تعمیر پیدا نشد.", ITEM_NOT_FOUND: "ردیف مصرف پیدا نشد یا متعلق به این پرونده نیست.",
  TASK_NOT_FOUND: "کار انتخاب‌شده متعلق به این پرونده نیست.", PART_UNAVAILABLE: "قطعهٔ انتخاب‌شده موجود یا فعال نیست.",
  ORDER_CLOSED: "پرونده بسته است؛ فقط قیمت‌های نامشخص قابل تکمیل‌اند.", ORDER_NOT_CLOSED: "قیمت را از ویرایش قطعهٔ مصرف‌شده ثبت کنید.",
  PRICE_ALREADY_RECORDED: "قیمت قبلاً ثبت شده و در پروندهٔ بسته قابل تغییر نیست.", UNKNOWN_STATE: "وضعیت پرونده یا کار انتخاب‌شده نامشخص است.",
};
export function workPartFieldErrors(state: WorkPartFormState, name: string): string[] {
  if (state.error?.type === "PART_UNAVAILABLE" && name === "partId") return [workPartMessages.PART_UNAVAILABLE];
  if (state.error?.type === "TASK_NOT_FOUND" && name === "taskId") return [workPartMessages.TASK_NOT_FOUND];
  if (state.error?.type !== "VALIDATION_ERROR") return [];
  const fields = state.error.fields, code = fields[name as keyof typeof fields];
  return code ? [code === "REQUIRED" ? "این فیلد را تکمیل کنید." : code === "TOO_LONG" ? "حداکثر ۱۰۰۰ نویسه وارد کنید." : name === "quantity" ? "مقدار مثبت با حداکثر ۱۶ رقم و دو رقم اعشار وارد کنید." : name === "unitPrice" ? "قیمت غیرمنفی با حداکثر ۱۶ رقم و دو رقم اعشار وارد کنید." : "مقدار واردشده معتبر نیست."] : [];
}
