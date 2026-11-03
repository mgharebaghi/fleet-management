import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { IconActionButton, IconActionGroup, IconActionLink } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { EditIcon, ViewIcon } from "../../../../../components/ui/icon/icons";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../../components/ui/pagination/pagination";
import { RecordCardList, RecordCard, RecordCardHeader, RecordCardDetails, RecordCardDetail } from "../../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { VehiclePlate } from "../../../../../components/ui/vehicle-plate/vehicle-plate";
import { requestIsEditable, type MaintenanceRequest } from "../../../application/requests/maintenance-request-records";
import { makeMaintenanceRequests } from "../../../composition/maintenance-request.factory";
import { requestDateFormatter, requestFollowUpBadge, requestPriorityBadge, requestSearch, requestPageHref, type RequestSearchParams } from "../shared/request-presentation";
import { MaintenanceRequestFilters } from "./maintenance-request-filters";
import { RequestStatusActions } from "../details/request-status-actions";
import { RequestDeleteButton } from "./request-delete-button";
import styles from "./request-list.module.css";
function RequestRowActions({ record }: { record: MaintenanceRequest }) {
  const name = `درخواست ${record.id}`;
  const editable = record.orderCount === 0 && requestIsEditable(record.status);
  return <IconActionGroup>
    <IconActionLink label={`مشاهدهٔ ${name}`} href={`/maintenance/requests/${record.id}`} icon={<ViewIcon />} />
    {record.orderCount === 0 && <>{editable ? <IconActionLink label={`ویرایش ${name}`} href={`/maintenance/requests/${record.id}/edit`} icon={<EditIcon />} /> : <IconActionButton label={`ویرایش ${name} امکان‌پذیر نیست؛ درخواست قابل تغییر نیست`} icon={<EditIcon />} disabled />}<RequestStatusActions id={record.id} status={record.status} compact /></>}
    <RequestDeleteButton record={record} />
  </IconActionGroup>;
}
export async function MaintenanceRequestsPage({ searchParams }: { searchParams: RequestSearchParams }) {
  const criteria = requestSearch(searchParams), manage = makeMaintenanceRequests();
  let result, references;
  try { [result, references] = await Promise.all([manage.list(criteria), manage.references()]); }
  catch { return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="درخواست‌های تعمیر" /><ResultState variant="error" title="دریافت درخواست‌های تعمیر امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href="/maintenance/requests">تلاش دوباره</ActionLink>} /></PageShell>; }
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title="درخواست‌های تعمیر" description="مشکل خودرو یا نیاز به سرویس را ثبت و پیگیری کنید. وضعیت رسیدگی را از پرونده‌های مرتبط دنبال کنید." action={<ActionLink href="/maintenance/requests/create" variant="primary">ثبت درخواست تعمیر</ActionLink>} />
    <MaintenanceRequestFilters criteria={criteria} references={references} />
    {result.rows.length ? <><DataTable caption="فهرست درخواست‌های تعمیر" stickyActions><thead><tr>{["زمان ثبت", "خودرو", "نوع کار و اولویت", "وضعیت رسیدگی", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.rows.map(record => <tr key={record.id}><td>{requestDateFormatter.format(new Date(record.requestedAt))}</td><td><TechnicalValue>{record.vehicle.code}</TechnicalValue> — {record.vehicle.brandName} {record.vehicle.modelName}<br /><VehiclePlate vehicle={record.vehicle} />{record.vehicle.isActive ? "" : " (غیرفعال)"}</td><td>{record.type.name}{record.type.isActive ? "" : " (غیرفعال)"}<div><StatusBadge {...requestPriorityBadge(record.priority)} /></div></td><td><StatusBadge {...requestFollowUpBadge(record)} /><div><small>{record.orderCount ? <><TechnicalValue>{record.orderCount}</TechnicalValue> پروندهٔ مرتبط</> : "بدون پرونده"}</small></div></td><td><div className={styles.rowActions}><RequestRowActions record={record} /></div></td></tr>)}</tbody></DataTable>
      <RecordCardList>{result.rows.map(record => <RecordCard key={record.id}><RecordCardHeader title={requestDateFormatter.format(new Date(record.requestedAt))} badge={<StatusBadge {...requestFollowUpBadge(record)} />} /><RecordCardDetails><RecordCardDetail label="خودرو"><TechnicalValue>{record.vehicle.code}</TechnicalValue> — {record.vehicle.brandName} {record.vehicle.modelName}{record.vehicle.isActive ? "" : " (غیرفعال)"}<br /><VehiclePlate vehicle={record.vehicle} /></RecordCardDetail><RecordCardDetail label="نوع کار">{record.type.name}{record.type.isActive ? "" : " (غیرفعال)"}</RecordCardDetail><RecordCardDetail label="اولویت"><StatusBadge {...requestPriorityBadge(record.priority)} /></RecordCardDetail><RecordCardDetail label="پرونده‌های تعمیر مرتبط">{record.orderCount ? <TechnicalValue>{record.orderCount}</TechnicalValue> : "هنوز تشکیل نشده"}</RecordCardDetail></RecordCardDetails><RequestRowActions record={record} /></RecordCard>)}</RecordCardList></> : <ResultState title="درخواستی مطابق جستجو پیدا نشد" description="درخواست جدید ثبت کنید یا فیلترها را تغییر دهید." />}
    <Pagination label="صفحه‌های درخواست تعمیر" currentPage={criteria.page} totalPages={Math.ceil(result.totalCount / 20)} buildHref={page => requestPageHref(searchParams, page)} />
  </PageShell>;
}
