"use server";
import { revalidatePath } from "next/cache";
import { makeWorkOrderParts } from "../../../composition/work-order-part.factory";
import { referenceTextFields } from "../../shared/form/maintenance-action-input";
import type { WorkPartFormState } from "../shared/work-part-presentation";
function refresh(orderId: number) {
  revalidatePath("/maintenance/requests/[requestId]", "page");
  for (const path of [`/maintenance/work-orders/${orderId}`, `/maintenance/work-orders/${orderId}/parts`, `/maintenance/work-orders/${orderId}/costs`, "/inventory/parts", "/maintenance/work-orders"]) revalidatePath(path);
  revalidatePath("/inventory/parts/[partId]", "page");
}
export async function saveWorkPartAction(orderId: number, id: number | null, previous: WorkPartFormState, data: FormData): Promise<WorkPartFormState> {
  void previous;
  const fields = referenceTextFields(data, ["partId", "taskId", "quantity", "unitPrice", "description"]);
  if (!fields) return { unavailable: true };
  try {
    const result = await makeWorkOrderParts().save(orderId, { id, partId: Number(fields.partId), taskId: fields.taskId === "" ? null : Number(fields.taskId), quantity: fields.quantity, unitPrice: fields.unitPrice, description: fields.description });
    if (!result.success) return { error: result.error };
    refresh(orderId); return { saved: true };
  } catch { return { unavailable: true }; }
}
export async function deleteWorkPartAction(orderId: number, id: number, previous: WorkPartFormState, data: FormData): Promise<WorkPartFormState> {
  void previous; void data;
  try {
    const result = await makeWorkOrderParts().delete(orderId, id);
    if (!result.success) return { error: result.error };
    refresh(orderId); return { saved: true };
  } catch { return { unavailable: true }; }
}
export async function fillWorkPartPriceAction(orderId: number, id: number, previous: WorkPartFormState, data: FormData): Promise<WorkPartFormState> {
  void previous;
  const fields = referenceTextFields(data, ["unitPrice"]);
  if (!fields) return { unavailable: true };
  try {
    const result = await makeWorkOrderParts().fillPrice(orderId, id, fields.unitPrice);
    if (!result.success) return { error: result.error };
    refresh(orderId); return { saved: true };
  } catch { return { unavailable: true }; }
}
