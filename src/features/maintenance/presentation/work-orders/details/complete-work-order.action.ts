"use server";
import { revalidatePath } from "next/cache";
import { makeCompleteWorkOrder } from "../../../composition/work-order.factory";
import type { WorkOrderCompletionFailure } from "../../../application/work-orders/work-order-completion-records";
import { referenceTextFields } from "../../shared/form/maintenance-action-input";
export type CompleteWorkOrderState = { saved?: boolean; error?: WorkOrderCompletionFailure | "UNAVAILABLE" };
export async function completeWorkOrderAction(id: number, previous: CompleteWorkOrderState, data: FormData): Promise<CompleteWorkOrderState> {
  void previous;
  const fields = referenceTextFields(data, ["result", "readingId"]);
  if (!fields) return { error: "UNAVAILABLE" };
  if (fields.readingId && !/^\d+$/.test(fields.readingId)) return { error: "INVALID_READING" };
  try {
    const result = await makeCompleteWorkOrder().execute({ id, result: fields.result, readingId: fields.readingId ? Number(fields.readingId) : null });
    if (!result.success) return { error: result.error };
    for (const path of ["/maintenance/work-orders", `/maintenance/work-orders/${id}`, `/maintenance/work-orders/${id}/tasks`, `/maintenance/work-orders/${id}/parts`, `/maintenance/work-orders/${id}/costs`, "/maintenance/requests", "/drivers", "/trips/requests"]) revalidatePath(path);
    for (const path of ["/maintenance/requests/[requestId]", "/drivers/[driverId]", "/trips/[tripRequestId]"]) revalidatePath(path, "page");
    revalidatePath("/maintenance/plans");
    revalidatePath("/maintenance/plans/[planId]", "page");
    revalidatePath("/maintenance/plans/[planId]/edit", "page");
    return { saved: true };
  } catch { return { error: "UNAVAILABLE" }; }
}
