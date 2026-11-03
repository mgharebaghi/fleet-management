"use server";
import { revalidatePath } from "next/cache";
import type { WorkOrderCancellationFailure } from "../../../application/work-orders/cancel-work-order";
import { makeCancelWorkOrder } from "../../../composition/work-order.factory";
import { referenceTextFields } from "../../shared/form/maintenance-action-input";
export type CancelWorkOrderState = { saved?: boolean; error?: WorkOrderCancellationFailure | "UNAVAILABLE" };
export async function cancelWorkOrderAction(id: number, previous: CancelWorkOrderState, data: FormData): Promise<CancelWorkOrderState> {
  void previous;
  const fields = referenceTextFields(data, ["reason"]);
  if (!fields) return { error: "UNAVAILABLE" };
  try {
    const result = await makeCancelWorkOrder().execute(id, fields.reason);
    if (!result.success) return { error: result.error };
    for (const path of ["/maintenance/work-orders", `/maintenance/work-orders/${id}`, `/maintenance/work-orders/${id}/tasks`, `/maintenance/work-orders/${id}/parts`, `/maintenance/work-orders/${id}/costs`, "/maintenance/requests"]) revalidatePath(path);
    revalidatePath("/maintenance/requests/[requestId]", "page");
    return { saved: true };
  } catch { return { error: "UNAVAILABLE" }; }
}
