import { WorkOrderFormPage } from "@/features/maintenance/presentation/work-orders/form/work-order-form-page";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const request = params.requestId, plan = params.planId;
  const candidate = request ?? plan;
  const valid = typeof candidate === "string" && /^\d+$/.test(candidate) && Number(candidate) > 0 && Number(candidate) <= 2147483647;
  const invalid = (request !== undefined && plan !== undefined) || (candidate !== undefined && !valid);
  return <WorkOrderFormPage invalidSource={invalid} selectedSource={!invalid && valid ? { kind: request !== undefined ? "Request" : "Plan", id: Number(candidate) } : undefined} />;
}
