import { normalizePersianNumerals } from "../../../../shared/text/persian-text";
import { workOrderIsEditable, workOrderStatuses, type WorkOrderRecord } from "../work-orders/work-order-records";
import { workTaskStatuses, type PreparedWorkOrderTask, type SaveWorkOrderTask, type WorkTaskFailure, type WorkTaskResult, type WorkTaskStatus } from "./work-order-task-records";
import type { WorkOrderTaskRepository } from "./work-order-task-repository";
const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2147483647;
const optional = (value: string | null) => value?.trim() || null;
const decimal = (value: string | null) => optional(value) === null ? null : normalizePersianNumerals(value!.trim()).replace(/٫/g, ".");
function validDecimal(value: string, digits: number) { return /^\d+(\.\d{1,2})?$/.test(value) && value.split(".")[0].replace(/^0+/, "").length <= digits; }
function knownOrder(order: WorkOrderRecord) { return order.origin !== "Unknown" && workOrderStatuses.includes(order.status as typeof workOrderStatuses[number]); }
function knownTask(status: string) { return workTaskStatuses.includes(status as WorkTaskStatus); }
export class ManageWorkOrderTasks {
  constructor(private readonly repository: WorkOrderTaskRepository) {}
  get(orderId: number) { return validId(orderId) ? this.repository.snapshot(orderId) : Promise.resolve(null); }
  async save(orderId: number, input: SaveWorkOrderTask): Promise<WorkTaskResult> {
    const value = { ...input, title: input.title.trim(), description: optional(input.description), laborHours: decimal(input.laborHours), laborCost: decimal(input.laborCost) };
    const fields: Extract<WorkTaskFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (!validId(orderId)) fields.orderId = "INVALID";
    if (value.id !== null && !validId(value.id)) fields.id = "INVALID";
    if (!value.title) fields.title = "REQUIRED"; else if (value.title.length > 200) fields.title = "TOO_LONG";
    if ((value.description?.length ?? 0) > 1000) fields.description = "TOO_LONG";
    if (value.technicianId !== null && !validId(value.technicianId)) fields.technicianId = "INVALID";
    if (value.laborHours !== null && !validDecimal(value.laborHours, 8)) fields.laborHours = "INVALID";
    if (value.laborCost !== null && !validDecimal(value.laborCost, 16)) fields.laborCost = "INVALID";
    if (!knownTask(value.status)) fields.status = "INVALID";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(orderId, async session => {
      const order = await session.order();
      if (!order) return { success: false, error: { type: "NOT_FOUND" } };
      if (!knownOrder(order)) return { success: false, error: { type: "UNKNOWN_STATE" } };
      if (!workOrderIsEditable(order.status)) return { success: false, error: { type: "ORDER_CLOSED" } };
      const existing = value.id === null ? null : await session.task(value.id);
      if (value.id !== null && (!existing || existing.orderId !== orderId)) return { success: false, error: { type: "TASK_NOT_FOUND" } };
      if (existing && !knownTask(existing.status)) return { success: false, error: { type: "UNKNOWN_STATE" } };
      if ((value.status === "InProgress" || value.status === "Completed") && (order.status !== "InProgress" || !order.startedAt)) return { success: false, error: { type: "ORDER_NOT_STARTED" } };
      if (value.technicianId !== null) {
        const technician = await session.technician(value.technicianId);
        if (!technician || (!technician.isActive && existing?.technicianId !== technician.id)) return { success: false, error: { type: "TECHNICIAN_UNAVAILABLE" } };
      }
      return { success: true, id: await session.save(value as PreparedWorkOrderTask) };
    });
  }
  async cancel(orderId: number, taskId: number): Promise<WorkTaskResult> {
    if (!validId(orderId) || !validId(taskId)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID" } } };
    return this.repository.atomic(orderId, async session => {
      const order = await session.order();
      if (!order) return { success: false, error: { type: "NOT_FOUND" } };
      if (!knownOrder(order)) return { success: false, error: { type: "UNKNOWN_STATE" } };
      if (!workOrderIsEditable(order.status)) return { success: false, error: { type: "ORDER_CLOSED" } };
      const task = await session.task(taskId);
      if (!task || task.orderId !== orderId) return { success: false, error: { type: "TASK_NOT_FOUND" } };
      if (!knownTask(task.status)) return { success: false, error: { type: "UNKNOWN_STATE" } };
      await session.cancel(taskId);
      return { success: true, id: taskId };
    });
  }
  async fillCost(orderId: number, taskId: number, amount: string): Promise<WorkTaskResult> {
    const value = decimal(amount);
    if (!validId(orderId) || !validId(taskId) || value === null || !validDecimal(value, 16)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { laborCost: value === null ? "REQUIRED" : "INVALID" } } };
    return this.repository.atomic(orderId, async session => {
      const order = await session.order();
      if (!order) return { success: false, error: { type: "NOT_FOUND" } };
      if (!knownOrder(order)) return { success: false, error: { type: "UNKNOWN_STATE" } };
      if (workOrderIsEditable(order.status)) return { success: false, error: { type: "ORDER_NOT_CLOSED" } };
      const task = await session.task(taskId);
      if (!task || task.orderId !== orderId) return { success: false, error: { type: "TASK_NOT_FOUND" } };
      if (!knownTask(task.status)) return { success: false, error: { type: "UNKNOWN_STATE" } };
      if (task.laborCost !== null) return { success: false, error: { type: "COST_ALREADY_RECORDED" } };
      await session.fillCost(taskId, value);
      return { success: true, id: taskId };
    });
  }
}
