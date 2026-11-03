import type { MaintenanceRequest } from "./maintenance-request-records";
export type RequestRepairStage = "Unlinked" | "Pending" | "InProgress" | "Completed" | "Cancelled" | "Unknown";
export function requestRepairStage(request: Pick<MaintenanceRequest, "orderCount" | "orderStatuses">): RequestRepairStage {
  const states = request.orderStatuses;
  if (!request.orderCount && !states.length) return "Unlinked";
  if (states.length !== request.orderCount || states.some(status => !["Open", "InProgress", "Completed", "Cancelled"].includes(status))) return "Unknown";
  if (states.includes("InProgress")) return "InProgress";
  if (states.includes("Open")) return "Pending";
  return states.includes("Completed") ? "Completed" : "Cancelled";
}

export const requestRepairFilters = ["RepairPending", "RepairInProgress", "RepairCompleted", "RepairCancelled", "RepairUnknown"] as const;
