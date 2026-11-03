import { workTaskStatuses } from "../work-order-tasks/work-order-task-records";
import { workOrderIsEditable, workOrderStatuses } from "./work-order-records";
import type { WorkOrderRepository } from "./work-order-repository";

export type WorkOrderCancellationFailure = "INVALID_ID" | "NOT_FOUND" | "ORDER_CLOSED" | "UNKNOWN_STATE" | "REASON_REQUIRED" | "REASON_TOO_LONG";
export type WorkOrderCancellationResult = { success: true } | { success: false; error: WorkOrderCancellationFailure };

export class CancelWorkOrder {
  constructor(private readonly repository: Pick<WorkOrderRepository, "atomic">) {}

  async execute(id: number, reason: string): Promise<WorkOrderCancellationResult> {
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return { success: false, error: "INVALID_ID" };
    const text = reason.trim();
    if (text.length > 1000) return { success: false, error: "REASON_TOO_LONG" };
    return this.repository.atomic({ orderId: id }, async session => {
      const order = await session.order(id);
      if (!order) return { success: false, error: "NOT_FOUND" };
      if (order.origin === "Unknown" || !workOrderStatuses.some(status => status === order.status)) return { success: false, error: "UNKNOWN_STATE" };
      if (!workOrderIsEditable(order.status)) return { success: false, error: "ORDER_CLOSED" };
      if (order.status === "InProgress" && !order.startedAt) return { success: false, error: "UNKNOWN_STATE" };
      const started = order.startedAt !== null;
      if (started && !text) return { success: false, error: "REASON_REQUIRED" };
      const finalReason = [order.finalDescription, text].filter(Boolean).join("\n") || null;
      if ((finalReason?.length ?? 0) > 1000) return { success: false, error: "REASON_TOO_LONG" };
      const tasks = await session.taskStates(id);
      if (tasks.some(task => !workTaskStatuses.some(status => status === task.status))) return { success: false, error: "UNKNOWN_STATE" };
      await session.cancelOrder(id, { reason: finalReason, started, unfinishedTaskIds: tasks.filter(task => task.status === "Open" || task.status === "InProgress").map(task => task.id) });
      return { success: true };
    });
  }
}
