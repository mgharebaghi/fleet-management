import type { StatusBadgeProps } from "../../../../../components/ui/status-badge/status-badge";
import type { WorkOrderRecord, WorkOrderSearch, WorkOrderSource } from "../../../application/work-orders/work-order-records";
import { normalizeWorkOrderSearch } from "../../../application/work-orders/manage-work-orders";
export const orderStatusLabels: Record<string, string> = { Open: "ثبت‌شده", InProgress: "در حال تعمیر", Completed: "تکمیل‌شده", Cancelled: "لغوشده" };
export function orderStatusBadge(status: string): StatusBadgeProps {
  return { pulse: status === "InProgress", label: Object.hasOwn(orderStatusLabels, status) ? orderStatusLabels[status] : "وضعیت نامشخص", tone: status === "Completed" ? "positive" : status === "InProgress" ? "warning" : status === "Open" ? "info" : "negative" };
}
export function orderOriginLabel(record: Pick<WorkOrderRecord, "origin" | "requestId" | "sourceTitle">) {
  return record.origin === "Request" ? "درخواست تعمیر" : record.origin === "Plan" ? `برنامهٔ سرویس: ${record.sourceTitle ?? "نامشخص"}` : record.origin === "Direct" ? "ثبت مستقیم" : "منشأ نامشخص";
}
export function orderSourceLabel(kind: "Request" | "Plan", source: WorkOrderSource) {
  return kind === "Request" ? `درخواست ${source.id}${source.problem ? ` — ${source.problem}` : ""}${source.available ? "" : " (بسته یا نامشخص)"}` : `${source.title}${source.available ? "" : " (غیرفعال)"}`;
}
export type OrderSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export function orderSearch(params: OrderSearchParams): WorkOrderSearch {
  const text = (key: string) => { const value = params[key]; return (Array.isArray(value) ? value[0] : value) ?? ""; };
  return normalizeWorkOrderSearch({ search: text("search"), status: text("status"), vehicleId: /^\d+$/.test(text("vehicleId")) ? Number(text("vehicleId")) : null, page: Number(text("page") || 1) });
}
export function orderPageHref(params: OrderSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  query.set("page", String(page)); return `/maintenance/work-orders?${query}`;
}

export function orderOriginBadge(record: Pick<WorkOrderRecord, "origin">): StatusBadgeProps {
  return { label: record.origin === "Plan" ? "برنامهٔ سرویس" : record.origin === "Request" ? "درخواست تعمیر" : record.origin === "Direct" ? "ثبت مستقیم" : "منشأ نامشخص", tone: record.origin === "Plan" ? "purple" : record.origin === "Request" ? "info" : "warning" };
}
