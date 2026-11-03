import type { StatusBadgeProps } from "../../../../components/ui/status-badge/status-badge";
import { formatDecimalAmount } from "../../../../components/ui/decimal-input/decimal-format";
import { formatDuration } from "../../../../components/ui/duration-input/duration-value";
import type { ServicePlanStatus, ServicePlanSearch, ServiceCriterion, ServicePlanFailure } from "../../application/service-plans/service-plan-records";
export const planStatuses: Record<ServicePlanStatus, string> = { Due: "موعدرسیده", Warning: "نزدیک موعد", Normal: "عادی", Unknown: "موعد نامشخص", Inactive: "غیرفعال" };
export function planBadge(status: ServicePlanStatus): StatusBadgeProps { return { label: planStatuses[status], tone: status === "Due" ? "negative" : status === "Warning" ? "warning" : status === "Normal" ? "positive" : status === "Unknown" ? "purple" : "info" }; }
export const criterionLabels = { km: "کیلومتر", days: "زمان (روز)", hours: "ساعت کارکرد" };
const dayFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "UTC", dateStyle: "short" });
export function planValue(value: string | null, key: ServiceCriterion["key"], date = false): string {
  if (value === null) return "نامشخص";
  return key === "days" ? date ? dayFormatter.format(new Date(`${value}T00:00:00Z`)) : formatDecimalAmount(value) : key === "hours" ? formatDuration(value) : formatDecimalAmount(value);
}
export type PlanFormState = { error?: ServicePlanFailure; unavailable?: boolean };
export const planFailureMessages = { PLAN_IN_USE: "این برنامه پروندهٔ مرتبط دارد و قابل حذف نیست؛ می‌توانید آن را غیرفعال کنید.", NOT_FOUND: "برنامه پیدا نشد.", VEHICLE_UNAVAILABLE: "یک خودروی فعال انتخاب کنید.", TYPE_UNAVAILABLE: "یک نوع تعمیر و سرویس فعال انتخاب کنید.", SOURCE_FIXED: "این برنامه پروندهٔ مرتبط دارد؛ خودرو و نوع سرویس قابل تغییر نیستند.", BASELINE_LOCKED: "مبنای سرویس تغییر کرده یا به پرونده متصل است؛ صفحه را به‌روزرسانی کنید. مبنا از پایان سرویس به‌روز می‌شود.", INTERVAL_REQUIRED: "حداقل یک فاصلهٔ سرویس مثبت تعیین کنید." };
export function planErrors(state: PlanFormState, field: string): string[] {
  if (state.error?.type === "VEHICLE_UNAVAILABLE" && field === "vehicleId") return [planFailureMessages.VEHICLE_UNAVAILABLE];
  if (state.error?.type === "TYPE_UNAVAILABLE" && field === "maintenanceTypeId") return [planFailureMessages.TYPE_UNAVAILABLE];
  if (state.error?.type !== "VALIDATION_ERROR") return [];
  const fields = state.error.fields, code = fields[field as keyof typeof fields];
  return !code ? [] : [code === "REQUIRED" ? "این مقدار را وارد کنید." : code === "TOO_LONG" ? "عنوان حداکثر ۲۰۰ نویسه باشد." : field.startsWith("warning") ? "هشدار باید غیرمنفی و کمتر از فاصلهٔ همان معیار باشد." : field === "lastDate" ? "تاریخ معتبر و غیرآینده انتخاب کنید." : field.endsWith("Days") ? "تعداد روز معتبر و مثبت وارد کنید." : field.startsWith("interval") ? "فاصلهٔ سرویس باید مثبت و حداکثر دارای دو رقم اعشار باشد." : "عدد معتبر و غیرمنفی با حداکثر دو رقم اعشار وارد کنید."];
}
export type PlanSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export function planSearch(params: PlanSearchParams): ServicePlanSearch {
  const text = (key: string) => { const value = params[key]; return (Array.isArray(value) ? value[0] : value) ?? ""; };
  const status = text("status");
  return { search: text("search"), status: Object.hasOwn(planStatuses, status) ? status : "", vehicleId: /^\d+$/.test(text("vehicleId")) && Number(text("vehicleId")) > 0 ? Number(text("vehicleId")) : null, page: /^\d+$/.test(text("page")) && Number(text("page")) > 0 ? Math.min(Number(text("page")), 1000000) : 1 };
}
export function planPageHref(params: PlanSearchParams, page: number) { const query = new URLSearchParams(); for (const [name, value] of Object.entries(params)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(name, item); query.set("page", String(page)); return `/maintenance/plans?${query}`; }

export function criterionExplanation(row: ServiceCriterion): string | null {
  if (row.status !== "Unknown") return null;
  if (row.last === null) return row.key === "days" ? "تاریخ آخرین سرویس ثبت نشده" : row.key === "km" ? "کیلومتر آخرین سرویس ثبت نشده" : "ساعت کارکرد آخرین سرویس ثبت نشده";
  if (row.current === null) return row.key === "km" ? "کیلومتر فعلی خودرو ثبت نشده" : "ساعت کارکرد فعلی خودرو ثبت نشده";
  return "مبنا، فاصله و کارکرد فعلی این معیار را بررسی کنید";
}
