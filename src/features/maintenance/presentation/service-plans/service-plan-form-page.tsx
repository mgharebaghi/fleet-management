import { FormActions } from "../../../../components/ui/form-field/form-field";
import { notFound } from "next/navigation";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { BackLink } from "../../../../components/ui/back-link/back-link";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { makeServicePlans } from "../../composition/service-plans/service-plan.factory";
import { tehranDateTimeInputs } from "../../../../shared/presentation/tehran-date-time";
import { ServicePlanForm } from "./service-plan-form";
export async function ServicePlanFormPage({ id }: { id?: number }) {
  let record, references;
  try { const manage = makeServicePlans(); [record, references] = await Promise.all([id === undefined ? Promise.resolve(undefined) : manage.get(id), manage.references()]); }
  catch { return <PageShell><ResultState variant="error" title="دریافت اطلاعات برنامه امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/maintenance/plans">برنامه‌های سرویس</ActionLink>} /></PageShell>; }
  if (record === null) notFound();
  const ready = references.vehicles.some(vehicle => vehicle.isActive) && references.types.some(type => type.isActive);
  return <PageShell width="narrow"><PageHeader eyebrow="تعمیرات و نگهداری" title={record ? "ویرایش برنامهٔ سرویس" : "ثبت برنامهٔ سرویس"} action={<BackLink href={record ? `/maintenance/plans/${record.plan.id}` : "/maintenance/plans"} label="بازگشت به برنامه‌های سرویس" />} compactAction />
    {!record && !ready ? <ResultState title="ابتدا خودرو و نوع سرویس فعال تعریف کنید" description="ثبت برنامه به خودرو و نوع تعمیر و سرویس نیاز دارد." action={<FormActions>{!references.vehicles.some(vehicle => vehicle.isActive) && <ActionLink href="/fleet/vehicles">مدیریت خودروها</ActionLink>}{!references.types.some(type => type.isActive) && <ActionLink href="/maintenance/catalogs">اطلاعات پایه</ActionLink>}</FormActions>} /> : <ServicePlanForm record={record?.plan} references={references} today={tehranDateTimeInputs(new Date()).day} />}
  </PageShell>;
}
