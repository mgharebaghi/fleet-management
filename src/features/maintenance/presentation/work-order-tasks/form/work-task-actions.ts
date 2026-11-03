"use server";
import { revalidatePath } from "next/cache";
import { makeWorkOrderTasks } from "../../../composition/work-order-task.factory";
import { referenceTextFields } from "../../shared/form/maintenance-action-input";
import type { WorkTaskFormState } from "../shared/work-task-presentation";
function refresh(orderId: number) {
  revalidatePath("/maintenance/requests/[requestId]", "page");
  for (const path of [`/maintenance/work-orders/${orderId}`, `/maintenance/work-orders/${orderId}/tasks`, `/maintenance/work-orders/${orderId}/parts`, `/maintenance/work-orders/${orderId}/costs`, "/maintenance/work-orders"]) revalidatePath(path);
}
export async function saveWorkTaskAction(orderId: number, taskId: number | null, previous: WorkTaskFormState, data: FormData): Promise<WorkTaskFormState> {
  void previous;
  const fields = referenceTextFields(data, ["title", "technicianId", "laborHours", "laborCost", "status", "description"]);
  if (!fields) return { unavailable: true };
  try {
    const result = await makeWorkOrderTasks().save(orderId, { id: taskId, title: fields.title, technicianId: fields.technicianId === "" ? null : Number(fields.technicianId), laborHours: fields.laborHours, laborCost: fields.laborCost, status: fields.status, description: fields.description });
    if (!result.success) return { error: result.error };
    refresh(orderId); return { saved: true };
  } catch { return { unavailable: true }; }
}
export async function cancelWorkTaskAction(orderId: number, taskId: number, previous: WorkTaskFormState, data: FormData): Promise<WorkTaskFormState> {
  void previous; void data;
  try {
    const result = await makeWorkOrderTasks().cancel(orderId, taskId);
    if (!result.success) return { error: result.error };
    refresh(orderId); return { saved: true };
  } catch { return { unavailable: true }; }
}
export async function fillWorkTaskCostAction(orderId: number, taskId: number, previous: WorkTaskFormState, data: FormData): Promise<WorkTaskFormState> {
  void previous;
  const fields = referenceTextFields(data, ["laborCost"]);
  if (!fields) return { unavailable: true };
  try {
    const result = await makeWorkOrderTasks().fillCost(orderId, taskId, fields.laborCost);
    if (!result.success) return { error: result.error };
    refresh(orderId); return { saved: true };
  } catch { return { unavailable: true }; }
}
