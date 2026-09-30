import { reportServerFailure } from "../../../infrastructure/observability/report-server-failure";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DriverResult } from "../application/driver-records";
import { formValues, type DriverActionState } from "./driver-form-data";

export async function submitDriverAction(data: FormData, work: (values: Record<string, string>) => Promise<DriverResult>, href: (id: number) => string): Promise<DriverActionState> {
  const values = formValues(data);
  if (!values) return { error: "INVALID_FORM" };
  let result: DriverResult;
  try { result = await work(values); } catch (error) { reportServerFailure("drivers.write", error); return { error: "UNEXPECTED", values }; }
  if (!result.success) return { error: result.error, values };
  revalidatePath("/drivers", "layout");
  redirect(href(result.id));
}
