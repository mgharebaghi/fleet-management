import { makeCompleteWorkOrder } from "../../../composition/work-order.factory";
import { WorkOrderResultPanel } from "./work-order-result-panel";
import { WorkOrderCostsPanel } from "../../work-order-costs/work-order-costs-panel";
import { makeWorkOrderParts } from "../../../composition/work-order-part.factory";
import { WorkOrderPartsPanel } from "../../work-order-parts/list/work-order-parts-panel";
import { RecordWorkspace } from "@/components/ui/record-workspace/record-workspace";
import { WorkOrderSidebar } from "./work-order-sidebar";
import workspaceStyles from "./work-order-workspace.module.css";
import { RecordTabs } from "../../../../../components/ui/record-tabs/record-tabs";
import { makeWorkOrderTasks } from "../../../composition/work-order-task.factory";
import { WorkOrderTasksPanel } from "../../work-order-tasks/list/work-order-tasks-panel";
import { notFound } from "next/navigation";
import { ActionLink } from "../../../../../components/ui/action-link/action-link";
import { BackLink } from "../../../../../components/ui/back-link/back-link";
import { FormSection } from "../../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { PageHeader } from "../../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../../components/ui/page-shell/page-shell";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { VehiclePlate } from "../../../../../components/ui/vehicle-plate/vehicle-plate";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { formatDuration } from "../../../../../components/ui/duration-input/duration-value";
import { workOrderStatuses } from "../../../application/work-orders/work-order-records";
import { MaintenanceRecordSummary } from "../../shared/record/maintenance-record-summary";
import { maintenanceVehicleLabel } from "../../shared/vehicle/maintenance-vehicle-option";
import styles from "../../shared/record/maintenance-record.module.css";
import { requestDateFormatter } from "../../requests/shared/request-presentation";
import { orderOriginBadge } from "../shared/work-order-presentation";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
export async function WorkOrderRecordPage({ id, section = "details" }: { id: number; section?: "details" | "tasks" | "parts" | "costs" }) {
  let record, taskSnapshot, partSnapshot;
  let completionReadings: Awaited<ReturnType<ReturnType<typeof makeCompleteWorkOrder>["references"]>> = [];
  try {
    [taskSnapshot, partSnapshot] = await Promise.all([makeWorkOrderTasks().get(id), makeWorkOrderParts().get(id)]); record = taskSnapshot?.order ?? null;
    if (record && record.status === "InProgress" && record.origin === "Plan") completionReadings = await makeCompleteWorkOrder().references(id);
  }
  catch { return <PageShell><ResultState variant="error" title="دریافت پرونده امکان‌پذیر نبود" description="لطفاً دوباره تلاش کنید." action={<ActionLink href={`/maintenance/work-orders/${id}${section === "details" ? "" : `/${section}`}`}>تلاش دوباره</ActionLink>} /></PageShell>; }
  if (!record) notFound();
  return <PageShell><PageHeader eyebrow="تعمیرات و نگهداری" title={(record.origin === "Plan" ? "پروندهٔ سرویس " : "پروندهٔ تعمیر ") + record.number} action={<BackLink href="/maintenance/work-orders" label="بازگشت به پرونده‌های تعمیر" />} compactAction />
    <div className={workspaceStyles.workspace}>
      <RecordWorkspace><RecordTabs label="بخش‌های پروندهٔ تعمیر" active={section} tabs={[{ id: "details", label: "اطلاعات و عیب‌یابی", href: `/maintenance/work-orders/${id}` }, { id: "tasks", label: "کارها و اجرت", href: `/maintenance/work-orders/${id}/tasks` }, { id: "parts", label: "قطعات مصرف‌شده", href: `/maintenance/work-orders/${id}/parts` }, { id: "costs", label: "نتیجه و هزینه‌ها", href: `/maintenance/work-orders/${id}/costs` }]}>{section === "costs" && taskSnapshot && partSnapshot ? <div className={styles.sections}><WorkOrderResultPanel order={record} /><WorkOrderCostsPanel orderId={id} tasks={taskSnapshot.tasks} items={partSnapshot.items} /></div> : section === "parts" && partSnapshot ? <WorkOrderPartsPanel snapshot={partSnapshot} /> : section === "tasks" && taskSnapshot ? <WorkOrderTasksPanel snapshot={taskSnapshot} /> : <div className={`${styles.sections} ${workspaceStyles.details}`}>
      <FormSection title="مشخصات پرونده"><MaintenanceRecordSummary columns={2} fieldClassName={workspaceStyles.fact} fields={[
        ["خودرو", <span key="vehicle">{maintenanceVehicleLabel(record.vehicle)}<br /><VehiclePlate vehicle={record.vehicle} /></span>], ["نوع تعمیر و سرویس", `${record.type.name}${record.type.isActive ? "" : " (غیرفعال)"}`], ["زمان ثبت", requestDateFormatter.format(new Date(record.openedAt))],
        ["محل انجام", record.workLocation === "OnSite" ? "تعمیر در محل" : record.workLocation === "Workshop" ? "تعمیرگاه" : "محل نامشخص"], ["تعمیرگاه", record.workshop ? `${record.workshop.name}${record.workshop.isActive ? "" : " (غیرفعال)"}` : "انتخاب نشده"], ["منشأ پرونده", <span key="origin"><StatusBadge {...orderOriginBadge(record)} />{record.planId && <><br /><ActionLink href={"/maintenance/plans/" + record.planId}>{record.sourceTitle ?? "مشاهدهٔ برنامهٔ سرویس"}</ActionLink></>}</span>],
              ]} /></FormSection>
      <FormSection title="کارکرد و زمان تعمیر"><MaintenanceRecordSummary columns={2} fieldClassName={workspaceStyles.fact} fields={[
        ["کیلومتر ثبت‌شده", <TechnicalValue key="odometer">{record.odometer === null ? "ثبت نشده" : formatDecimalAmount(record.odometer)}</TechnicalValue>], ["ساعت کارکرد ثبت‌شده", <TechnicalValue key="hours">{record.engineHours === null ? "ثبت نشده" : formatDuration(record.engineHours)}</TechnicalValue>], ["شروع تعمیر", record.startedAt ? requestDateFormatter.format(new Date(record.startedAt)) : "هنوز شروع نشده"], ["پایان تعمیر", record.endedAt ? requestDateFormatter.format(new Date(record.endedAt)) : "هنوز ثبت نشده"],
      ]} /></FormSection>
      <FormSection title="شرح و عیب‌یابی"><MaintenanceRecordSummary fields={[["شرح مشکل یا نیاز به سرویس", <span className={styles.text} key="problem">{record.problem ?? "شرحی ثبت نشده است."}</span>], ["عیب‌یابی اولیه", <span className={styles.text} key="diagnosis">{record.diagnosis ?? "عیب‌یابی ثبت نشده است."}</span>]]} /></FormSection>
      {record.description && <FormSection title="یادداشت تکمیلی"><p className={styles.text}>{record.description}</p></FormSection>}
      {(record.origin === "Unknown" || !workOrderStatuses.includes(record.status as typeof workOrderStatuses[number])) && <InlineNotice role="alert" tone="danger">وضعیت یا منشأ پرونده نامشخص است و قابل ویرایش نیست.</InlineNotice>}
      </div>}</RecordTabs>
      {taskSnapshot && <WorkOrderSidebar snapshot={taskSnapshot} parts={partSnapshot ?? undefined} section={section} completionReadings={completionReadings} />}
      </RecordWorkspace>
    </div>
  </PageShell>;
}
