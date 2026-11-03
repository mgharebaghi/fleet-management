"use client";
import { RecordDetailsButton } from "../../../../../components/ui/record-details-button/record-details-button";

import { useState } from "react";
import { DataTable } from "../../../../../components/ui/data-table/data-table";
import { FormSection } from "../../../../../components/ui/form-field/form-field";
import { IconActionButton, IconActionGroup } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { DeleteIcon, EditIcon } from "../../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { ResultState } from "../../../../../components/ui/result-state/result-state";
import { RecordCard, RecordCardDetails, RecordCardDetail, RecordCardHeader, RecordCardList } from "../../../../../components/ui/record-cards/record-cards";
import { StatusBadge } from "../../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../../components/ui/technical-value/technical-value";
import { formatDecimalAmount } from "../../../../../components/ui/decimal-input/decimal-format";
import { workOrderIsEditable, workOrderStatuses } from "../../../application/work-orders/work-order-records";
import type { WorkOrderPart, WorkPartSnapshot } from "../../../application/work-order-parts/work-order-part-records";
import { workPartCosts } from "../../../application/work-order-parts/work-part-costs";
import { MaintenanceRecordSummary } from "../../shared/record/maintenance-record-summary";
import styles from "../../shared/record/maintenance-record.module.css";
import { CreateWorkPartButton, WorkPartDialog, DeleteWorkPartDialog } from "../form/work-part-dialog";

export function WorkOrderPartsPanel({ snapshot }: { snapshot: WorkPartSnapshot }) {
  const { order, items, tasks } = snapshot;
  const known = order.origin !== "Unknown" && workOrderStatuses.some(status => status === order.status);
  const editable = known && workOrderIsEditable(order.status), costs = workPartCosts(items);
  const [selected, setSelected] = useState<{ mode: "edit" | "delete" | "price"; item: WorkOrderPart } | null>(null);
  const name = (item: WorkOrderPart) => item.part?.name ?? "قطعه در کاتالوگ پیدا نشد";
  const amount = (value: string | null) => value === null ? "نامشخص" : <><TechnicalValue>{formatDecimalAmount(value)}</TechnicalValue> تومان</>;
  const taskTitle = (item: WorkOrderPart) => item.taskId === null ? "کل پرونده" : tasks.find(task => task.id === item.taskId)?.title ?? "کار مرتبط پیدا نشد";
  function actions(item: WorkOrderPart) {
    const fillPrice = known && !editable && item.unitPrice === null;
    return <IconActionGroup><RecordDetailsButton title={name(item)} fields={[["قطعه", name(item)], ["کار مرتبط", taskTitle(item)], ["مقدار مصرف", formatDecimalAmount(item.quantity)], ["قیمت هر واحد", amount(item.unitPrice)], ["مبلغ کل", amount(item.totalPrice)]]} description={item.description} /><IconActionButton label={editable ? `ویرایش مصرف ${name(item)}` : fillPrice ? `تکمیل قیمت ${name(item)}` : `ویرایش مصرف ${name(item)} امکان‌پذیر نیست`} icon={<EditIcon />} disabled={!editable && !fillPrice} onClick={() => setSelected({ mode: fillPrice ? "price" : "edit", item })} />{editable && <IconActionButton label={`حذف مصرف ${name(item)}`} icon={<DeleteIcon />} tone="danger" onClick={() => setSelected({ mode: "delete", item })} />}</IconActionGroup>;
  }
  return <div className={styles.sections}>
    <InlineNotice tone="info">ثبت مصرف، موجودی انبار را تغییر نمی‌دهد؛ خروج انبار را جداگانه ثبت کنید.</InlineNotice>
    <FormSection title="قطعات مصرف‌شده" action={editable ? <CreateWorkPartButton snapshot={snapshot} compact /> : undefined}>
      {items.length > 0 && (costs ? <MaintenanceRecordSummary fields={[
        ["جمع هزینهٔ قطعاتِ مشخص‌شده", <span key="sum">{amount(costs.knownTotal)}</span>],
        ["وضعیت قیمت‌ها", <StatusBadge key="price-state" tone={costs.missingCount ? "warning" : "positive"} label={costs.missingCount ? `قیمت ${new Intl.NumberFormat("fa-IR").format(costs.missingCount)} ردیف نامشخص است` : "قیمت همهٔ قطعات ثبت شده"} />],
      ]} /> : <InlineNotice tone="danger" role="alert">مقدار یا مبلغ نامعتبر در سوابق وجود دارد؛ جمع هزینهٔ قطعات قابل محاسبه نیست.</InlineNotice>)}
      {items.length ? <><DataTable caption="قطعات مصرف‌شدهٔ پروندهٔ تعمیر" stickyActions><thead><tr>{["قطعه و کار مرتبط", "مقدار مصرف", "قیمت هر واحد", "مبلغ کل", "عملیات"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id}>
        <td><strong>{name(item)}</strong><br /><small>{item.part ? <>کد قطعه: <TechnicalValue>{item.part.code}</TechnicalValue>{!item.part.isActive && " (غیرفعال)"}</> : <>شناسهٔ قطعه: <TechnicalValue>{String(item.partId)}</TechnicalValue></>}</small><div><small>کار: {taskTitle(item)}</small></div></td>
        <td><TechnicalValue>{formatDecimalAmount(item.quantity)}</TechnicalValue> {item.part?.unitName ?? "واحد نامشخص"}</td><td>{amount(item.unitPrice)}</td><td>{amount(item.totalPrice)}</td><td>{actions(item)}</td>
      </tr>)}</tbody></DataTable><RecordCardList>{items.map(item => <RecordCard key={item.id}><RecordCardHeader title={name(item)} /><RecordCardDetails>
        <RecordCardDetail label={item.part ? "کد قطعه" : "شناسهٔ قطعه"}><TechnicalValue>{item.part?.code ?? String(item.partId)}</TechnicalValue>{item.part && !item.part.isActive && " (غیرفعال)"}</RecordCardDetail>
        <RecordCardDetail label="کار مرتبط">{taskTitle(item)}</RecordCardDetail><RecordCardDetail label="مقدار مصرف"><TechnicalValue>{formatDecimalAmount(item.quantity)}</TechnicalValue> {item.part?.unitName ?? "واحد نامشخص"}</RecordCardDetail>
        <RecordCardDetail label="قیمت هر واحد">{amount(item.unitPrice)}</RecordCardDetail><RecordCardDetail label="مبلغ کل">{amount(item.totalPrice)}</RecordCardDetail>
      </RecordCardDetails>{actions(item)}</RecordCard>)}</RecordCardList></> : <ResultState title="قطعه‌ای برای این پرونده ثبت نشده است" description={editable ? "برای افزودن مصرف، دکمهٔ ثبت قطعه را بزنید." : "مصرفی در سوابق این پرونده وجود ندارد."} />}
    </FormSection>
    {selected?.mode === "edit" && <WorkPartDialog snapshot={snapshot} item={selected.item} onClose={() => setSelected(null)} />}
    {selected?.mode === "price" && <WorkPartDialog snapshot={snapshot} item={selected.item} priceOnly onClose={() => setSelected(null)} />}
    {selected?.mode === "delete" && <DeleteWorkPartDialog orderId={order.id} item={selected.item} onClose={() => setSelected(null)} />}
  </div>;
}
