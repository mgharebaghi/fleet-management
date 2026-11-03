import { notFound } from "next/navigation";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { FormSection } from "../../../../../components/ui/form-field/form-field";
import { RecordWorkspace, RecordSidePanel } from "@/components/ui/record-workspace/record-workspace";
import { orderStatusBadge } from "../../work-orders/shared/work-order-presentation";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { RecordCardList, RecordCard, RecordCardHeader } from "../../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { formatDuration } from "../../../../../components/ui/duration-input/duration-value";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { VehiclePlate } from "../../../../../components/ui/vehicle-plate/vehicle-plate";
import { requestIsEditable } from "../../../application/requests/maintenance-request-records";
import { makeMaintenanceRequests } from "../../../composition/maintenance-request.factory";
import { MaintenanceRecordSummary } from "../../shared/record/maintenance-record-summary";
import { requestDateFormatter, requestFollowUpBadge, requestPriorityBadge } from "../shared/request-presentation";
import { RequestStatusActions } from "./request-status-actions";
import { requestFailureMessages } from "../shared/request-form-state";
import { RequestRepairSummary } from "./request-repair-summary";
import workspaceStyles from "./request-workspace.module.css";
import styles from "../../shared/record/maintenance-record.module.css";
export async function MaintenanceRequestRecordPage({ id }: { id: number }) {
  let record;
  try { record = await makeMaintenanceRequests().get(id); }
  catch { return <PageShell><ResultState variant="error" title="دریافت درخواست امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={`/maintenance/requests/${id}`}>تلاش دوباره</ActionLink>} /></PageShell>; }
  if (!record) notFound();
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title={"درخواست تعمیر " + id} action={<BackLink href="/maintenance/requests" label="بازگشت به درخواست‌های تعمیر" />} compactAction />
    <RecordWorkspace><div className={styles.sections}>
    <FormSection title="اطلاعات درخواست"><div className={workspaceStyles.content}><MaintenanceRecordSummary fields={[
      ["خودرو", <span key="vehicle"><TechnicalValue>{record.vehicle.code}</TechnicalValue> — {record.vehicle.brandName} {record.vehicle.modelName}{record.vehicle.isActive ? "" : " (غیرفعال)"}<br /><VehiclePlate vehicle={record.vehicle} /></span>],
      ["نوع کار", `${record.type.name}${record.type.isActive ? "" : " (غیرفعال)"}`], ["زمان ثبت", requestDateFormatter.format(new Date(record.requestedAt))], ["اولویت", <StatusBadge key="priority" {...requestPriorityBadge(record.priority)} />],
      ["کیلومتر گزارش‌شده", <TechnicalValue key="odometer">{record.reportedOdometer === null ? "ثبت نشده" : formatDecimalAmount(record.reportedOdometer)}</TechnicalValue>], ["ساعت کارکرد گزارش‌شده", <TechnicalValue key="hours">{record.reportedEngineHours === null ? "ثبت نشده" : formatDuration(record.reportedEngineHours)}</TechnicalValue>],
    ]} />
      <div className={workspaceStyles.description}><h3>شرح مشکل یا نیاز به سرویس</h3><p>{record.problem ?? "شرحی ثبت نشده است."}</p></div>
      {record.description && <div className={workspaceStyles.description}><h3>یادداشت تکمیلی</h3><p>{record.description}</p></div>}
    </div></FormSection>
    <FormSection title="پرونده‌های تعمیر مرتبط" action={record.orders.length > 0 && requestIsEditable(record.status) ? <ActionLink size="sm" href={`/maintenance/work-orders/create?requestId=${id}`}>ثبت پروندهٔ جدید</ActionLink> : undefined}>{record.orders.length ? <><DataTable caption="پرونده‌های مرتبط با درخواست"><thead><tr><th scope="col">شمارهٔ پرونده</th><th scope="col">وضعیت پرونده</th></tr></thead><tbody>{record.orders.map(order => <tr key={order.id}><td><ActionLink href={`/maintenance/work-orders/${order.id}`}><TechnicalValue>{order.number}</TechnicalValue></ActionLink></td><td><StatusBadge {...orderStatusBadge(order.status)} /></td></tr>)}</tbody></DataTable><RecordCardList>{record.orders.map(order => <RecordCard key={order.id}><RecordCardHeader title={<ActionLink href={`/maintenance/work-orders/${order.id}`}><TechnicalValue>{order.number}</TechnicalValue></ActionLink>} badge={<StatusBadge {...orderStatusBadge(order.status)} />} /></RecordCard>)}</RecordCardList></> : <p>پروندهٔ تعمیری برای این درخواست ثبت نشده است.</p>}</FormSection>
    </div>
    <RecordSidePanel title="پیگیری درخواست" summary={<div><StatusBadge {...requestFollowUpBadge(record)} /></div>}>
      {record.orders.length > 0 ? <RequestRepairSummary orders={record.orders} /> : <>
        {requestIsEditable(record.status) && <FormSection title="پروندهٔ تعمیر" description="برای ثبت کارها، قطعات و نتیجهٔ تعمیر، پرونده تشکیل دهید."><ActionLink variant="primary" href={`/maintenance/work-orders/create?requestId=${id}`}>ثبت پروندهٔ تعمیر</ActionLink></FormSection>}
        {requestIsEditable(record.status) ? <FormSection title="عملیات درخواست"><RequestStatusActions id={id} status={record.status}><ActionLink href={`/maintenance/requests/${id}/edit`}>ویرایش درخواست</ActionLink></RequestStatusActions></FormSection> : record.status === "Completed" || record.status === "Cancelled" ? <InlineNotice tone="info">این درخواست بسته است و قابل تغییر نیست.</InlineNotice> : <InlineNotice tone="danger" role="alert">{requestFailureMessages.UNKNOWN_STATUS}</InlineNotice>}
      </>}
    </RecordSidePanel></RecordWorkspace>
  </PageShell>;
}
