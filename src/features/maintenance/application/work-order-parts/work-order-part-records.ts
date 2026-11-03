import type { WorkOrderRecord } from "../work-orders/work-order-records";
export type ConsumablePart = { id: number; code: string; name: string; unitName: string; isActive: boolean };
export type WorkPartTask = { id: number; orderId: number; title: string; status: string };
export type WorkOrderPart = {
  id: number; orderId: number; taskId: number | null; partId: number; part: ConsumablePart | null;
  quantity: string; unitPrice: string | null; totalPrice: string | null; description: string | null; createdAt: string;
};
export type SaveWorkOrderPart = { id: number | null; partId: number; taskId: number | null; quantity: string; unitPrice: string | null; description: string | null };
export type WorkPartSnapshot = { order: WorkOrderRecord; items: WorkOrderPart[]; tasks: WorkPartTask[]; catalog: ConsumablePart[] };
export type WorkPartFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof SaveWorkOrderPart | "orderId", "REQUIRED" | "INVALID" | "TOO_LONG">> }
  | { type: "NOT_FOUND" | "ITEM_NOT_FOUND" | "TASK_NOT_FOUND" | "PART_UNAVAILABLE" | "ORDER_CLOSED" | "ORDER_NOT_CLOSED" | "PRICE_ALREADY_RECORDED" | "UNKNOWN_STATE" };
export type WorkPartResult = { success: true; id: number } | { success: false; error: WorkPartFailure };
