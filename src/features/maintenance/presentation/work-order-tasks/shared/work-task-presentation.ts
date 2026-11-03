import type { StatusBadgeProps } from "../../../../../components/ui/status-badge/status-badge";
import type { WorkTaskFailure, WorkTaskTechnician } from "../../../application/work-order-tasks/work-order-task-records";
export const taskStatusLabels: Record<string, string> = { Open: "ثبت‌شده", InProgress: "در حال انجام", Completed: "انجام‌شده", Cancelled: "لغوشده" };
export function taskStatusBadge(status: string): StatusBadgeProps {
  return { label: Object.hasOwn(taskStatusLabels, status) ? taskStatusLabels[status] : "وضعیت نامشخص", tone: status === "Open" ? "info" : status === "InProgress" ? "warning" : status === "Completed" ? "positive" : "negative" };
}
export function taskTechnicianLabel(technician: WorkTaskTechnician) {
  return `${technician.name}${technician.specialty ? ` — ${technician.specialty}` : ""}${technician.workshopName ? ` — ${technician.workshopName}` : " — مستقل"}${technician.isActive ? "" : " (غیرفعال)"}`;
}
export type WorkTaskFormState = { saved?: boolean; error?: WorkTaskFailure; unavailable?: boolean };
export const taskFailureMessages: Record<Exclude<WorkTaskFailure["type"], "VALIDATION_ERROR">, string> = {
  NOT_FOUND: "پروندهٔ تعمیر پیدا نشد. صفحه را به‌روزرسانی کنید.", TASK_NOT_FOUND: "کار انتخاب‌شده متعلق به این پرونده نیست یا پیدا نشد.",
  ORDER_CLOSED: "پرونده بسته است؛ فقط اجرتی که قبلاً ثبت نشده قابل تکمیل است.", UNKNOWN_STATE: "وضعیت ذخیره‌شده نامشخص است؛ برای بررسی با پشتیبانی تماس بگیرید.",
  TECHNICIAN_UNAVAILABLE: "تعمیرکار انتخاب‌شده موجود یا فعال نیست.", ORDER_NOT_STARTED: "برای ثبت کار در حال انجام یا انجام‌شده، ابتدا باید تعمیر خودرو شروع شده باشد.",
  COST_ALREADY_RECORDED: "اجرت این کار قبلاً ثبت شده است و در پروندهٔ بسته قابل تغییر نیست.", ORDER_NOT_CLOSED: "برای پروندهٔ باز، اجرت را از ویرایش کار ثبت کنید.",
};
export function taskFieldErrors(state: WorkTaskFormState, name: string): string[] {
  if (state.error?.type === "TECHNICIAN_UNAVAILABLE" && name === "technicianId") return [taskFailureMessages.TECHNICIAN_UNAVAILABLE];
  if (state.error?.type === "ORDER_NOT_STARTED" && name === "status") return [taskFailureMessages.ORDER_NOT_STARTED];
  if (state.error?.type !== "VALIDATION_ERROR") return [];
  const fields = state.error.fields, code = fields[name as keyof typeof fields];
  return code ? [code === "REQUIRED" ? "این فیلد را تکمیل کنید." : code === "TOO_LONG" ? "متن واردشده بیش از حد مجاز است." : name === "laborHours" ? "زمان معتبر و غیرمنفی با حداکثر ۸ رقم ساعت و دو رقم اعشار وارد کنید." : name === "laborCost" ? "مبلغ معتبر و غیرمنفی با حداکثر ۱۶ رقم و دو رقم اعشار وارد کنید." : "مقدار واردشده معتبر نیست."] : [];
}
