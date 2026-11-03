import { notFound } from "next/navigation";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { requestIsEditable } from "../../../application/requests/maintenance-request-records";
import { makeMaintenanceRequests } from "../../../composition/maintenance-request.factory";
import { MaintenanceRequestForm } from "./maintenance-request-form";
export async function MaintenanceRequestFormPage({ id }: { id?: number }) {
  const manage = makeMaintenanceRequests();
  let record, references;
  try {
    record = id === undefined ? undefined : await manage.get(id);
    references = await manage.references();
  } catch { return <PageShell><ResultState variant="error" title="دریافت اطلاعات درخواست امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={id === undefined ? "/maintenance/requests/create" : `/maintenance/requests/${id}/edit`}>تلاش دوباره</ActionLink>} /></PageShell>; }
  if (record === null) notFound();
  const missingVehicle = !references.vehicles.some(vehicle => vehicle.isActive), missingType = !references.types.some(type => type.isActive);
  const prerequisiteDescription = [
    missingVehicle ? references.vehicles.length ? "خودروهای ثبت‌شده غیرفعال‌اند؛ ابتدا یک خودرو را فعال کنید." : "ابتدا یک خودرو ثبت کنید." : "",
    missingType ? references.types.length ? "انواع تعمیر و سرویس ثبت‌شده غیرفعال‌اند؛ ابتدا یکی را فعال کنید." : "ابتدا یک نوع تعمیر و سرویس ثبت کنید." : "",
  ].filter(Boolean).join(" ");
  return <PageShell width="narrow"><PageHeader eyebrow="تعمیرات و نگهداری" title={record ? "ویرایش درخواست تعمیر" : "ثبت درخواست تعمیر"} action={<BackLink href="/maintenance/requests" label="بازگشت به درخواست‌های تعمیر" />} compactAction />
    {record && (record.orderCount > 0 || !requestIsEditable(record.status)) ? <ResultState title="این درخواست قابل ویرایش نیست" description="درخواست دارای پرونده، بسته یا لغوشده قابل ویرایش نیست؛ رسیدگی را از جزئیات درخواست ادامه دهید." action={<ActionLink href={`/maintenance/requests/${record.id}`}>مشاهدهٔ درخواست</ActionLink>} /> : !record && (missingVehicle || missingType) ? <ResultState title="ابتدا اطلاعات لازم برای درخواست را آماده کنید" description={prerequisiteDescription} action={<FormActions>{missingVehicle && <ActionLink href={references.vehicles.length ? "/fleet/vehicles?active=all" : "/fleet/vehicles/create"}>{references.vehicles.length ? "مدیریت خودروها" : "ثبت خودرو"}</ActionLink>}{missingType && <ActionLink href={references.types.length ? "/maintenance/catalogs?active=all" : "/maintenance/catalogs/create"}>{references.types.length ? "اطلاعات پایه" : "ثبت نوع تعمیر و سرویس"}</ActionLink>}</FormActions>} /> : <MaintenanceRequestForm record={record} references={references} />}
  </PageShell>;
}
