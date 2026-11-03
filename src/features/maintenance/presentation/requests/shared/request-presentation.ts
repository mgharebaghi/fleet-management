import type { MaintenanceRequest } from "../../../application/requests/maintenance-request-records";
import { requestRepairStage } from "../../../application/requests/request-repair-stage";
import type { StatusBadgeProps } from "../../../../../components/ui/status-badge/status-badge";
import { normalizeRequestSearch } from "../../../application/requests/manage-maintenance-requests";
export const requestStatusLabels: Record<string, string> = { Open: "ثبت‌شده", InProgress: "در حال پیگیری", Completed: "بسته‌شده", Cancelled: "لغوشده" };
export function requestStatusBadge(status: string): StatusBadgeProps {
  return { label: requestStatusLabels[status] ?? "وضعیت نامشخص", tone: status === "Completed" ? "positive" : status === "Cancelled" || !requestStatusLabels[status] ? "negative" : status === "InProgress" ? "warning" : "info" };
}
export function requestPriorityBadge(priority: string | null): StatusBadgeProps {
  const tones: Record<string, StatusBadgeProps["tone"]> = { "فوری": "negative", "زیاد": "warning", "عادی": "info", "کم": "positive" };
  return { label: priority ?? "تعیین نشده", tone: priority ? tones[priority] ?? "purple" : "info" };
}
export const requestDateFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" });
export type RequestSearchParams = Readonly<Record<string, string | string[] | undefined>>;
export function requestSearch(params: RequestSearchParams) {
  const value = (name: string) => { const item = params[name]; return (Array.isArray(item) ? item[0] : item) ?? ""; };
  const id = (name: string) => /^\d+$/.test(value(name)) ? Number(value(name)) : null;
  return normalizeRequestSearch({ search: value("search"), status: value("status"), vehicleId: id("vehicleId"), maintenanceTypeId: id("maintenanceTypeId"), page: Number(value("page") || 1) });
}
export function requestPageHref(params: RequestSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(name, item);
  query.set("page", String(page)); return `/maintenance/requests?${query}`;
}

export function requestFollowUpBadge(request: Pick<MaintenanceRequest, "status" | "orderCount" | "orderStatuses">): StatusBadgeProps {
  const stage = requestRepairStage(request);
  const badges: Record<Exclude<ReturnType<typeof requestRepairStage>, "Unlinked">, StatusBadgeProps> = {
    Pending: { label: "در انتظار تعمیر", tone: "info" }, InProgress: { label: "در حال تعمیر", tone: "warning", pulse: true },
    Completed: { label: "تعمیر انجام‌شده", tone: "positive" }, Cancelled: { label: "تعمیر لغوشده", tone: "negative" },
    Unknown: { label: "وضعیت تعمیر نامشخص", tone: "negative" },
  };
  return stage === "Unlinked" ? requestStatusBadge(request.status) : badges[stage];
}

export const requestFollowUpLabels: Record<string, string> = { ...requestStatusLabels, RepairPending: "در انتظار تعمیر", RepairInProgress: "در حال تعمیر", RepairCompleted: "تعمیر انجام‌شده", RepairCancelled: "تعمیر لغوشده", RepairUnknown: "وضعیت تعمیر نامشخص" };
