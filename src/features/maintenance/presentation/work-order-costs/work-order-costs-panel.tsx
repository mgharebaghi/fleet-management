import { DataTable } from "../../../../components/ui/data-table/data-table";
import { FormSection } from "../../../../components/ui/form-field/form-field";
import { IconActionGroup, IconActionLink } from "../../../../components/ui/icon-action-button/icon-action-button";
import { ViewIcon } from "../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { RecordCard, RecordCardDetails, RecordCardDetail, RecordCardHeader, RecordCardList } from "../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { formatDecimalAmount } from "../../../../components/ui/decimal-input/decimal-format";
import { workOrderCostSummary, type WorkOrderCostGroup } from "../../application/work-order-costs/work-order-cost-summary";
import type { WorkOrderTask } from "../../application/work-order-tasks/work-order-task-records";
import type { WorkOrderPart } from "../../application/work-order-parts/work-order-part-records";
import { MaintenanceRecordSummary } from "../shared/record/maintenance-record-summary";
import styles from "../shared/record/maintenance-record.module.css";

const count = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
function Amount({ value }: { value: string | null }) {
  return value === null ? <>هنوز مشخص نیست</> : <><TechnicalValue>{formatDecimalAmount(value)}</TechnicalValue> تومان</>;
}
function Subtotal({ group }: { group: WorkOrderCostGroup }) {
  if (group.invalid) return <>خطای محاسبه</>;
  if (group.count === 0) return <>ثبت نشده</>;
  return <Amount value={group.knownTotal} />;
}

export function WorkOrderCostsPanel({ orderId, tasks, items }: { orderId: number; tasks: readonly WorkOrderTask[]; items: readonly WorkOrderPart[] }) {
  const summary = workOrderCostSummary(tasks, items);
  const statusLabel = { empty: "ثبت نشده", incomplete: "هزینه‌ها کامل نیست", complete: "همهٔ مبلغ‌ها مشخص است", invalid: "خطای محاسبه" }[summary.status];
  const rows = [
    { id: "labor", title: "اجرت کارها", group: summary.labor, unit: "کار", href: `/maintenance/work-orders/${orderId}/tasks`, action: "بررسی اجرت کارها" },
    { id: "parts", title: "هزینهٔ قطعات", group: summary.parts, unit: "ردیف مصرف", href: `/maintenance/work-orders/${orderId}/parts`, action: "بررسی قیمت قطعات" },
  ];
  const actions = (row: typeof rows[number]) => <IconActionGroup><IconActionLink href={row.href} label={row.action} icon={<ViewIcon />} /></IconActionGroup>;
  return <div className={styles.sections}>
    <FormSection title="جمع‌بندی هزینه‌ها">
      {summary.status === "empty" ? <ResultState title="هنوز کار یا قطعه‌ای ثبت نشده است" description="از تب‌های کارها و قطعات مصرف‌شده شروع کنید." /> : <MaintenanceRecordSummary fields={[
        ["جمع مبلغ‌های مشخص‌شده", summary.status === "invalid" ? "قابل محاسبه نیست" : <strong key="sum"><Amount value={summary.total} /></strong>],
        ["وضعیت هزینه‌ها", <StatusBadge key="status" label={statusLabel} tone={summary.status === "invalid" ? "negative" : summary.status === "incomplete" ? "warning" : "positive"} />],
      ]} />}
      {summary.status === "invalid" && <InlineNotice role="alert" tone="danger">مبلغ یا مقدار نامعتبر در سوابق وجود دارد؛ بخش دارای خطا را بررسی کنید.</InlineNotice>}
      <DataTable caption="تفکیک هزینه‌های پروندهٔ تعمیر" stickyActions><thead><tr>{["بخش", "تعداد", "مبلغ مشخص‌شده", "مبلغ نامشخص", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
        {rows.map(row => <tr key={row.id}><td><strong>{row.title}</strong></td><td>{count(row.group.count)} {row.unit}</td><td><Subtotal group={row.group} /></td><td>{row.group.missingCount ? `${count(row.group.missingCount)} مورد` : "—"}</td><td>{actions(row)}</td></tr>)}
      </tbody></DataTable>
      <RecordCardList>{rows.map(row => <RecordCard key={row.id}><RecordCardHeader title={row.title} /><RecordCardDetails>
        <RecordCardDetail label="تعداد">{count(row.group.count)} {row.unit}</RecordCardDetail><RecordCardDetail label="مبلغ مشخص‌شده"><Subtotal group={row.group} /></RecordCardDetail><RecordCardDetail label="مبلغ نامشخص">{row.group.missingCount ? `${count(row.group.missingCount)} مورد` : "—"}</RecordCardDetail>
      </RecordCardDetails>{actions(row)}</RecordCard>)}</RecordCardList>
    </FormSection>
  </div>;
}
