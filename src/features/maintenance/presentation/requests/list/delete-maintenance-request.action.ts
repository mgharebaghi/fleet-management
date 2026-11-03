"use server";
import { revalidatePath } from "next/cache";
import { makeMaintenanceRequests } from "../../../composition/maintenance-request.factory";
import type { RequestFormState } from "../shared/request-form-state";

export async function deleteMaintenanceRequestAction(id: number, previous: RequestFormState, data: FormData): Promise<RequestFormState> {
  void previous; void data;
  try {
    const result = await makeMaintenanceRequests().remove(id);
    if (!result.success) return { error: result.error };
    for (const path of ["/maintenance/requests", `/maintenance/requests/${id}`, `/maintenance/requests/${id}/edit`]) revalidatePath(path);
    return { saved: true };
  } catch { return { unavailable: true }; }
}
