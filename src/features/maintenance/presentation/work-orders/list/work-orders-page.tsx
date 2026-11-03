import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { ViewIcon } from "../../../../../components/ui/icon/icons";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import { RecordCard, RecordCardDetail, RecordCardDetails, RecordCardHeader, RecordCardList } from "../../../../../components/ui/record-cards/record-cards";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { VehiclePlate } from "../../../../../components/ui/vehicle-plate/vehicle-plate";
import type { WorkOrderRecord } from "../../../application/work-orders/work-order-records";
import { makeWorkOrders } from "../../../composition/work-order.factory";
import { maintenanceVehicleLabel } from "../../shared/vehicle/maintenance-vehicle-option";
import { requestDateFormatter } from "../../requests/shared/request-presentation";
import { orderOriginBadge, orderPageHref, orderSearch, orderStatusBadge, type OrderSearchParams } from "../shared/work-order-presentation";
import { WorkOrderFilters } from "./work-order-filters";
function OrderActions({ record }: { record: WorkOrderRecord }) {
  return <ActionLink href={`/maintenance/work-orders/${record.id}`} variant="secondary" size="sm"><ViewIcon />مشاهدهٔ پرونده</ActionLink>;
}
export async function WorkOrdersPage({ searchParams }: { searchParams: OrderSearchParams }) {
  const criteria = orderSearch(searchParams); let result, references;
  try { const manage = makeWorkOrders(); [result, references] = await Promise.all([manage.list(criteria), manage.references()]); }
  catch { return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="پرونده‌های تعمیر/سرویس" /><ResultState variant="error" title="دریافت پرونده‌های تعمیر/سرویس امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/maintenance/work-orders">تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="پرونده‌های تعمیر/سرویس" description="ثبت و آماده‌سازی پرونده برای تعمیر خودرو یا انجام سرویس؛ ثبت پرونده به معنی شروع تعمیر نیست." action={<ActionLink variant="primary" href="/maintenance/work-orders/create">ثبت پروندهٔ تعمیر/سرویس</ActionLink>} />
    <WorkOrderFilters criteria={criteria} references={references} />
    {result.rows.length ? <><DataTable caption="فهرست پرونده‌های تعمیر/سرویس" stickyActions><thead><tr>{["شماره و زمان ثبت", "خودرو", "نوع تعمیر و سرویس", "محل انجام", "منشأ پرونده", "وضعیت", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(record => <tr key={record.id}>
      <td><TechnicalValue>{record.number}</TechnicalValue><br />{requestDateFormatter.format(new Date(record.openedAt))}</td><td>{maintenanceVehicleLabel(record.vehicle)}<br /><VehiclePlate vehicle={record.vehicle} /></td><td>{record.type.name}</td><td>{record.workLocation === "OnSite" ? "تعمیر در محل" : record.workLocation === "Workshop" ? record.workshop?.name ?? "تعمیرگاه نامشخص" : "محل نامشخص"}</td><td><StatusBadge {...orderOriginBadge(record)} /></td><td><StatusBadge {...orderStatusBadge(record.status)} /></td><td><OrderActions record={record} /></td>
    </tr>)}</tbody></DataTable><RecordCardList>{result.rows.map(record => <RecordCard key={record.id}><RecordCardHeader title={<TechnicalValue>{record.number}</TechnicalValue>} badge={<StatusBadge {...orderStatusBadge(record.status)} />} /><RecordCardDetails><RecordCardDetail label="زمان ثبت">{requestDateFormatter.format(new Date(record.openedAt))}</RecordCardDetail><RecordCardDetail label="خودرو">{maintenanceVehicleLabel(record.vehicle)}<br /><VehiclePlate vehicle={record.vehicle} /></RecordCardDetail><RecordCardDetail label="نوع تعمیر و سرویس">{record.type.name}</RecordCardDetail><RecordCardDetail label="محل انجام">{record.workLocation === "OnSite" ? "تعمیر در محل" : record.workLocation === "Workshop" ? record.workshop?.name ?? "تعمیرگاه نامشخص" : "محل نامشخص"}</RecordCardDetail><RecordCardDetail label="منشأ پرونده"><StatusBadge {...orderOriginBadge(record)} /></RecordCardDetail></RecordCardDetails><OrderActions record={record} /></RecordCard>)}</RecordCardList></> : <ResultState title="پرونده‌ای مطابق جستجو پیدا نشد" description="پرونده ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های پرونده‌های تعمیر/سرویس" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => orderPageHref(searchParams, page)} />
  </PageShell>;
}
