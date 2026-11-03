"use server";
import { revalidatePath } from "next/cache";
import { makeStartWorkOrder } from "../../../composition/work-order.factory";
import type { WorkOrderStartFailure } from "../../../application/work-orders/work-order-start-records";
import { referenceCheckbox } from "../../shared/form/maintenance-action-input";
export type StartWorkOrderState = { saved?: boolean; error?: WorkOrderStartFailure | "UNAVAILABLE"; plannedTrips?: number };
export async function startWorkOrderAction(id: number, previous: StartWorkOrderState, data: FormData): Promise<StartWorkOrderState> {
  void previous;
  const acknowledge = referenceCheckbox(data, "acknowledgePlannedTrips");
  if (acknowledge === null) return { error: "UNAVAILABLE" };
  try {
    const result = await makeStartWorkOrder().execute(id, acknowledge);
    if (!result.success) return { error: result.error, plannedTrips: result.plannedTrips };
    for (const path of ["/maintenance/work-orders", `/maintenance/work-orders/${id}`, `/maintenance/work-orders/${id}/tasks`, `/maintenance/work-orders/${id}/parts`, `/maintenance/work-orders/${id}/costs`, "/trips/requests", "/drivers", "/maintenance/requests"]) revalidatePath(path);
    revalidatePath("/maintenance/requests/[requestId]", "page");
    revalidatePath("/trips/[tripRequestId]", "page"); revalidatePath("/drivers/[driverId]", "page");
    return { saved: true };
  } catch { return { error: "UNAVAILABLE" }; }
}
