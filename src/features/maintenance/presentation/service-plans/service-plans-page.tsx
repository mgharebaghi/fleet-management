import { ServicePlanDeleteButton } from "./service-plan-delete-button";
import { ServiceCriterionProgress } from "./service-criterion-progress";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { IconActionGroup, IconActionLink } from "../../../../components/ui/icon-action-button/icon-action-button";
import { ViewIcon, EditIcon } from "../../../../components/ui/icon/icons";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../components/ui/record-cards/record-cards";
import { Pagination } from "../../../../components/ui/pagination/pagination";
import { VehiclePlate } from "../../../../components/ui/vehicle-plate/vehicle-plate";
import { makeServicePlans } from "../../composition/service-plans/service-plan.factory";
import { maintenanceVehicleLabel } from "../shared/vehicle/maintenance-vehicle-option";
import { ServicePlanFilters } from "./service-plan-filters";
import { planBadge, planSearch, planPageHref, criterionLabels, planValue, type PlanSearchParams } from "./service-plan-presentation";
export async function ServicePlansPage({ searchParams }: { searchParams: PlanSearchParams }) {
  const criteria = planSearch(searchParams); let result, references;
  try { const manage = makeServicePlans(); [result, references] = await Promise.all([manage.list(criteria), manage.references()]); }
  catch { return <PageShell><ResultState variant="error" title="دریافت برنامه‌های سرویس امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/maintenance/plans">تلاش دوباره</ActionLink>} /></PageShell>; }
  const actions = (id: number, title: string, orderCount: number) => <IconActionGroup><IconActionLink href={`/maintenance/plans/${id}`} label={`مشاهدهٔ برنامه ${title}`} icon={<ViewIcon />} /><IconActionLink href={`/maintenance/plans/${id}/edit`} label={`ویرایش برنامه ${title}`} icon={<EditIcon />} /><ServicePlanDeleteButton id={id} title={title} orderCount={orderCount} /></IconActionGroup>;
  const targets = (due: typeof result.rows[number]["due"]) => due.criteria.length ? due.criteria.map(row => <div key={row.key}>{criterionLabels[row.key]}: {planValue(row.next, row.key, row.key === "days")}<ServiceCriterionProgress criterion={row} /></div>) : "معیاری ثبت نشده";
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="برنامه‌های سرویس" description="موعد سرویس هر خودرو را بر پایهٔ زمان، کیلومتر یا ساعت کارکرد پیگیری کنید." action={<ActionLink variant="primary" href="/maintenance/plans/create">ثبت برنامهٔ سرویس</ActionLink>} />
    <ServicePlanFilters criteria={criteria} references={references} />
    {result.rows.length ? <><DataTable caption="فهرست برنامه‌های سرویس" stickyActions><thead><tr>{["عنوان برنامه", "خودرو", "نوع سرویس", "موعد بعدی", "وضعیت", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(({ plan, due }) => <tr key={plan.id}><td>{plan.title}</td><td>{maintenanceVehicleLabel(plan.vehicle)}<br /><VehiclePlate vehicle={plan.vehicle} /></td><td>{plan.type.name}</td><td>{targets(due)}</td><td><StatusBadge {...planBadge(due.status)} /></td><td>{actions(plan.id, plan.title, plan.orderCount)}</td></tr>)}</tbody></DataTable>
    <RecordCardList>{result.rows.map(({ plan, due }) => <RecordCard key={plan.id}><RecordCardHeader title={plan.title} badge={<StatusBadge {...planBadge(due.status)} />} /><RecordCardDetails><RecordCardDetail label="خودرو">{maintenanceVehicleLabel(plan.vehicle)}<br /><VehiclePlate vehicle={plan.vehicle} /></RecordCardDetail><RecordCardDetail label="نوع سرویس">{plan.type.name}</RecordCardDetail><RecordCardDetail label="موعد بعدی">{targets(due)}</RecordCardDetail></RecordCardDetails>{actions(plan.id, plan.title, plan.orderCount)}</RecordCard>)}</RecordCardList></> : <ResultState title="برنامه‌ای مطابق جستجو پیدا نشد" description="برنامه ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های برنامه‌های سرویس" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => planPageHref(searchParams, page)} />
  </PageShell>;
}
