"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { makeServicePlans } from "../../composition/service-plans/service-plan.factory";
import type { PlanFormState } from "./service-plan-presentation";
export async function deleteServicePlanAction(id: number, previous: PlanFormState, data: FormData): Promise<PlanFormState> {
  void previous; void data;
  let result;
  try { result = await makeServicePlans().remove(id); }
  catch { return { unavailable: true }; }
  if (!result.success) return { error: result.error };
  for (const path of ["/maintenance/plans", `/maintenance/plans/${id}`, `/maintenance/plans/${id}/edit`, "/maintenance/work-orders/create"]) revalidatePath(path);
  redirect("/maintenance/plans");
}
