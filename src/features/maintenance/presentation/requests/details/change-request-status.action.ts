"use server";
import { revalidatePath } from "next/cache";
import { makeMaintenanceRequests } from "../../../composition/maintenance-request.factory";
import type { RequestFormState } from "../shared/request-form-state";
export async function changeRequestStatusAction(id: number, status: string, previous: RequestFormState, data: FormData): Promise<RequestFormState> {
  void previous; void data;
  try {
    const result = await makeMaintenanceRequests().changeStatus(id, status);
    if (!result.success) return { error: result.error };
    revalidatePath("/maintenance/requests"); revalidatePath(`/maintenance/requests/${id}`); revalidatePath(`/maintenance/requests/${id}/edit`);
    return { saved: true };
  } catch { return { unavailable: true }; }
}
