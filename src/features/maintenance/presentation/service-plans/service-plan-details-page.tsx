import { ServiceCriterionProgress } from "./service-criterion-progress";
import { notFound } from "next/navigation";
import { ServicePlanDeleteButton } from "./service-plan-delete-button";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { BackLink } from "../../../../components/ui/back-link/back-link";
import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { FieldHint, FormSection } from "../../../../components/ui/form-field/form-field";
import { RecordWorkspace, RecordSidePanel } from "../../../../components/ui/record-workspace/record-workspace";
import { RecordSummary } from "../../../../components/ui/record-summary/record-summary";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { VehiclePlate } from "../../../../components/ui/vehicle-plate/vehicle-plate";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../components/ui/record-cards/record-cards";
import { makeServicePlans } from "../../composition/service-plans/service-plan.factory";
import { orderStatusBadge } from "../work-orders/shared/work-order-presentation";
import { maintenanceVehicleLabel } from "../shared/vehicle/maintenance-vehicle-option";
import { planBadge, planValue, criterionLabels } from "./service-plan-presentation";
import styles from "./service-plan.module.css";
export async function ServicePlanDetailsPage({ id }: { id: number }) {
  let record;
  try { record = await makeServicePlans().get(id); }
  catch { return <PageShell><ResultState variant="error" title="دریافت برنامه امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={`/maintenance/plans/${id}`}>تلاش دوباره</ActionLink>} /></PageShell>; }
  if (!record) notFound();
  const { plan, due, orders } = record, canCreate = plan.isActive && plan.vehicle.isActive && plan.type.isActive;
  return <PageShell><PageHeader eyebrow="برنامه‌های سرویس" title={plan.title} description={plan.type.name} action={<BackLink href="/maintenance/plans" label="بازگشت به برنامه‌های سرویس" />} compactAction />
    <RecordWorkspace><div className={styles.form}>
      <FormSection title="معیارهای سرویس">{due.criteria.length ? <><DataTable caption="معیارهای برنامهٔ سرویس"><thead><tr>{["معیار", "آخرین سرویس", "فاصلهٔ سرویس", "هشدار", "موعد بعدی", "وضعیت"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{due.criteria.map(row => <tr key={row.key}><td>{criterionLabels[row.key]}</td><td>{planValue(row.last, row.key, row.key === "days")}</td><td>{planValue(row.interval, row.key)}</td><td>{row.warning === null ? "—" : planValue(row.warning, row.key)}</td><td>{planValue(row.next, row.key, row.key === "days")}</td><td><div><StatusBadge {...planBadge(row.status)} /><ServiceCriterionProgress criterion={row} /></div></td></tr>)}</tbody></DataTable><RecordCardList>{due.criteria.map(row => <RecordCard key={row.key}><RecordCardHeader title={criterionLabels[row.key]} badge={<div><StatusBadge {...planBadge(row.status)} /><ServiceCriterionProgress criterion={row} /></div>} /><RecordCardDetails><RecordCardDetail label="آخرین سرویس">{planValue(row.last, row.key, row.key === "days")}</RecordCardDetail><RecordCardDetail label="فاصلهٔ سرویس">{planValue(row.interval, row.key)}</RecordCardDetail><RecordCardDetail label="هشدار">{row.warning === null ? "—" : planValue(row.warning, row.key)}</RecordCardDetail><RecordCardDetail label="موعد بعدی">{planValue(row.next, row.key, row.key === "days")}</RecordCardDetail></RecordCardDetails></RecordCard>)}</RecordCardList></> : <p>معیار قابل محاسبه‌ای ثبت نشده است.</p>}
      {plan.description && <p className={styles.note}>{plan.description}</p>}</FormSection>
      <FormSection title="پرونده‌های سرویس مرتبط">{orders.length ? <><DataTable caption="پرونده‌های برنامهٔ سرویس"><thead><tr><th scope="col">شمارهٔ پرونده</th><th scope="col">وضعیت</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><ActionLink href={`/maintenance/work-orders/${order.id}`}><TechnicalValue>{order.number}</TechnicalValue></ActionLink></td><td><StatusBadge {...orderStatusBadge(order.status)} /></td></tr>)}</tbody></DataTable><RecordCardList>{orders.map(order => <RecordCard key={order.id}><RecordCardHeader title={<ActionLink href={`/maintenance/work-orders/${order.id}`}><TechnicalValue>{order.number}</TechnicalValue></ActionLink>} badge={<StatusBadge {...orderStatusBadge(order.status)} />} /></RecordCard>)}</RecordCardList></> : <p>هنوز پرونده‌ای از این برنامه تشکیل نشده است.</p>}</FormSection>
    </div>
    <RecordSidePanel title="خلاصهٔ برنامه" summary={<div><StatusBadge {...planBadge(due.status)} /></div>}>
      <p>{maintenanceVehicleLabel(plan.vehicle)}</p><div><VehiclePlate vehicle={plan.vehicle} /></div>
      <section className={styles.operations}><h3>کارکرد فعلی خودرو</h3><RecordSummary fieldClassName={styles.fact} fields={[["کیلومتر", planValue(plan.currentOdometer, "km")], ["ساعت موتور", planValue(plan.currentHours, "hours")]]} /></section>
      <section className={styles.operations}><h3>عملیات</h3>{canCreate ? <ActionLink variant="primary" href={`/maintenance/work-orders/create?planId=${id}`}>تشکیل پروندهٔ سرویس</ActionLink> : <><ActionButton disabled>تشکیل پروندهٔ سرویس</ActionButton><FieldHint>برنامه، خودرو یا نوع سرویس غیرفعال است.</FieldHint></>}<ActionLink href={`/maintenance/plans/${id}/edit`}>ویرایش برنامه</ActionLink><ServicePlanDeleteButton id={id} title={plan.title} orderCount={plan.orderCount} icon={false} />{plan.orderCount > 0 && <FieldHint>برای توقف برنامه، آن را از بخش ویرایش غیرفعال کنید.</FieldHint>}</section>
    </RecordSidePanel></RecordWorkspace>
  </PageShell>;
}
