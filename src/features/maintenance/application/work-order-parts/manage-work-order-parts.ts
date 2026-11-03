import { normalizePersianNumerals } from "../../../../shared/text/persian-text";
import { workOrderIsEditable, workOrderStatuses } from "../work-orders/work-order-records";
import { workTaskStatuses } from "../work-order-tasks/work-order-task-records";
import type { WorkOrderPartRepository, WorkOrderPartSession } from "./work-order-part-repository";
import type { SaveWorkOrderPart, WorkPartFailure, WorkPartResult } from "./work-order-part-records";
const validId = (value: number) => Number.isInteger(value) && value > 0 && value <= 2147483647;
const decimal = (value: string) => normalizePersianNumerals(value.trim()).replace(/٫/g, ".");
const validDecimal = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && value.split(".")[0].replace(/^0+/, "").length <= 16;
async function parentFailure(session: WorkOrderPartSession, closed: boolean): Promise<WorkPartFailure | null> {
  const order = await session.order();
  if (!order) return { type: "NOT_FOUND" };
  if (order.origin === "Unknown" || !workOrderStatuses.some(status => status === order.status)) return { type: "UNKNOWN_STATE" };
  if (closed && workOrderIsEditable(order.status)) return { type: "ORDER_NOT_CLOSED" };
  if (!closed && !workOrderIsEditable(order.status)) return { type: "ORDER_CLOSED" };
  return null;
}
async function taskFailure(session: WorkOrderPartSession, id: number | null, orderId: number): Promise<WorkPartFailure | null> {
  if (id === null) return null;
  const task = await session.task(id);
  if (!task || task.orderId !== orderId) return { type: "TASK_NOT_FOUND" };
  return workTaskStatuses.some(status => status === task.status) ? null : { type: "UNKNOWN_STATE" };
}
export class ManageWorkOrderParts {
  constructor(private readonly repository: WorkOrderPartRepository) {}
  get(orderId: number) { return validId(orderId) ? this.repository.snapshot(orderId) : Promise.resolve(null); }
  async save(orderId: number, input: SaveWorkOrderPart): Promise<WorkPartResult> {
    const value = { ...input, quantity: decimal(input.quantity), unitPrice: input.unitPrice?.trim() ? decimal(input.unitPrice) : null, description: input.description?.trim() || null };
    const fields: Extract<WorkPartFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (!validId(orderId)) fields.orderId = "INVALID";
    if (value.id !== null && !validId(value.id)) fields.id = "INVALID";
    if (!validId(value.partId)) fields.partId = "REQUIRED";
    if (value.taskId !== null && !validId(value.taskId)) fields.taskId = "INVALID";
    if (!value.quantity) fields.quantity = "REQUIRED";
    else if (!validDecimal(value.quantity) || !/[1-9]/.test(value.quantity)) fields.quantity = "INVALID";
    if (value.unitPrice !== null && !validDecimal(value.unitPrice)) fields.unitPrice = "INVALID";
    if ((value.description?.length ?? 0) > 1000) fields.description = "TOO_LONG";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(orderId, async session => {
      const error = await parentFailure(session, false); if (error) return { success: false, error };
      const existing = value.id === null ? null : await session.item(value.id);
      if (value.id !== null && (!existing || existing.orderId !== orderId)) return { success: false, error: { type: "ITEM_NOT_FOUND" } };
      const part = await session.catalog.part(value.partId);
      if (!part || (!part.isActive && existing?.partId !== part.id)) return { success: false, error: { type: "PART_UNAVAILABLE" } };
      const taskError = await taskFailure(session, value.taskId, orderId); if (taskError) return { success: false, error: taskError };
      return { success: true, id: await session.save(value) };
    });
  }
  async delete(orderId: number, id: number): Promise<WorkPartResult> {
    if (!validId(orderId) || !validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID" } } };
    return this.repository.atomic(orderId, async session => {
      const error = await parentFailure(session, false); if (error) return { success: false, error };
      const item = await session.item(id);
      if (!item || item.orderId !== orderId) return { success: false, error: { type: "ITEM_NOT_FOUND" } };
      await session.delete(id); return { success: true, id };
    });
  }
  async fillPrice(orderId: number, id: number, input: string): Promise<WorkPartResult> {
    const value = decimal(input);
    if (!validId(orderId) || !validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID" } } };
    if (!value || !validDecimal(value)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { unitPrice: value ? "INVALID" : "REQUIRED" } } };
    return this.repository.atomic(orderId, async session => {
      const error = await parentFailure(session, true); if (error) return { success: false, error };
      const item = await session.item(id);
      if (!item || item.orderId !== orderId) return { success: false, error: { type: "ITEM_NOT_FOUND" } };
      if (item.unitPrice !== null) return { success: false, error: { type: "PRICE_ALREADY_RECORDED" } };
      const taskError = await taskFailure(session, item.taskId, orderId); if (taskError) return { success: false, error: taskError };
      await session.fillPrice(id, value); return { success: true, id };
    });
  }
}
