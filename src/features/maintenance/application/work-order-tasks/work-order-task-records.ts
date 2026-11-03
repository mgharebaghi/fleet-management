import type { WorkOrderRecord } from "../work-orders/work-order-records";
export const workTaskStatuses = ["Open", "InProgress", "Completed", "Cancelled"] as const;
export type WorkTaskStatus = typeof workTaskStatuses[number];
export type WorkTaskTechnician = { id: number; name: string; specialty: string | null; workshopName: string | null; isActive: boolean };
export type WorkOrderTask = {
  id: number; orderId: number; title: string; technicianId: number | null; technician: WorkTaskTechnician | null;
  laborHours: string | null; laborCost: string | null; status: string; description: string | null; createdAt: string;
};
export type SaveWorkOrderTask = { id: number | null; title: string; technicianId: number | null; laborHours: string | null; laborCost: string | null; status: string; description: string | null };
export type PreparedWorkOrderTask = Omit<SaveWorkOrderTask, "status"> & { status: WorkTaskStatus };
export type WorkTaskSnapshot = { order: WorkOrderRecord; tasks: WorkOrderTask[]; technicians: WorkTaskTechnician[] };
export type WorkTaskFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof SaveWorkOrderTask | "orderId", "REQUIRED" | "INVALID" | "TOO_LONG">> }
  | { type: "NOT_FOUND" | "TASK_NOT_FOUND" | "ORDER_CLOSED" | "UNKNOWN_STATE" | "TECHNICIAN_UNAVAILABLE" | "ORDER_NOT_STARTED" | "COST_ALREADY_RECORDED" | "ORDER_NOT_CLOSED" };
export type WorkTaskResult = { success: true; id: number } | { success: false; error: WorkTaskFailure };
