import { notFound } from "next/navigation";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { workOrderIsEditable } from "../../../application/work-orders/work-order-records";
import { makeWorkOrders } from "../../../composition/work-order.factory";
import { WorkOrderForm, type OrderSourceSelection } from "./work-order-form";
export async function WorkOrderFormPage({ id, selectedSource, invalidSource = false }: { id?: number; selectedSource?: OrderSourceSelection; invalidSource?: boolean }) {
  const sourceQuery = selectedSource ? `${selectedSource.kind === "Request" ? "requestId" : "planId"}=${selectedSource.id}` : invalidSource ? "requestId=invalid" : "";
  const retryHref = id === undefined ? `/maintenance/work-orders/create${sourceQuery ? `?${sourceQuery}` : ""}` : `/maintenance/work-orders/${id}/edit`;
  let record, references;
  try { const manage = makeWorkOrders(); [record, references] = await Promise.all([id === undefined ? Promise.resolve(undefined) : manage.get(id), manage.references()]); }
  catch { return <PageShell><ResultState variant="error" title="دریافت اطلاعات پرونده امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={retryHref}>تلاش دوباره</ActionLink>} /></PageShell>; }
  if (record === null) notFound();
  const missingVehicle = !references.vehicles.some(vehicle => vehicle.isActive), missingType = !references.types.some(type => type.isActive);
  const source = selectedSource ? (selectedSource.kind === "Request" ? references.requests : references.plans).find(item => item.id === selectedSource.id) : undefined;
  return <PageShell width="narrow"><PageHeader eyebrow="تعمیرات و نگهداری" title={record ? "ویرایش اطلاعات و عیب‌یابی" : "ثبت پروندهٔ تعمیر"} action={<BackLink href={record ? `/maintenance/work-orders/${record.id}` : "/maintenance/work-orders"} label={record ? "بازگشت به پروندهٔ تعمیر" : "بازگشت به پرونده‌های تعمیر"} />} compactAction />
    {record && (!workOrderIsEditable(record.status) || record.origin === "Unknown") ? <ResultState title="این پرونده قابل ویرایش نیست" description="پروندهٔ بسته یا دارای وضعیت و منشأ نامشخص قابل تغییر نیست." action={<ActionLink href={`/maintenance/work-orders/${record.id}`}>مشاهدهٔ پرونده</ActionLink>} /> : invalidSource || (selectedSource && !source?.available) ? <ResultState title="منشأ انتخاب‌شده قابل استفاده نیست" description="درخواست باید باز و برنامهٔ سرویس باید فعال باشد. منشأ را بررسی کنید یا پرونده را مستقیم ثبت کنید." action={<ActionLink href="/maintenance/work-orders/create">ثبت مستقیم پرونده</ActionLink>} /> : !record && (missingVehicle || missingType) ? <ResultState title="ابتدا اطلاعات لازم برای پرونده را آماده کنید" description="ثبت پرونده به خودروی فعال و نوع تعمیر و سرویس فعال نیاز دارد." action={<FormActions>{missingVehicle && <ActionLink href={references.vehicles.length ? "/fleet/vehicles?active=all" : "/fleet/vehicles/create"}>مدیریت خودروها</ActionLink>}{missingType && <ActionLink href={references.types.length ? "/maintenance/catalogs?active=all" : "/maintenance/catalogs/create"}>اطلاعات پایه</ActionLink>}</FormActions>} /> : <WorkOrderForm record={record} references={references} selectedSource={selectedSource} />}
  </PageShell>;
}
