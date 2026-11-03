"use client";
import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { IconActionButton } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { DeleteIcon } from "../../../../../components/ui/icon/icons";
import { requestStatuses, type MaintenanceRequest, type RequestStatus } from "../../../application/requests/maintenance-request-records";
import { RequestFormFeedback } from "../shared/request-form-feedback";
import type { RequestFormState } from "../shared/request-form-state";
import { requestDateFormatter } from "../shared/request-presentation";
import { deleteMaintenanceRequestAction } from "./delete-maintenance-request.action";

export function RequestDeleteButton({ record }: { record: MaintenanceRequest }) {
  const [open, setOpen] = useState(false);
  const disabled = record.orderCount > 0 || !requestStatuses.includes(record.status as RequestStatus);
  const label = record.orderCount > 0 ? `حذف درخواست ${record.id} امکان‌پذیر نیست؛ پروندهٔ تعمیر دارد` : disabled ? `حذف درخواست ${record.id} امکان‌پذیر نیست؛ وضعیت نامشخص است` : `حذف درخواست ${record.id}`;
  return <><IconActionButton label={label} icon={<DeleteIcon />} tone="danger" disabled={disabled} onClick={() => setOpen(true)} />{open && <DeleteRequestDialog record={record} onClose={() => setOpen(false)} />}</>;
}

function DeleteRequestDialog({ record, onClose }: { record: MaintenanceRequest; onClose: () => void }) {
  const [state, action, pending] = useActionState(deleteMaintenanceRequestAction.bind(null, record.id), {} as RequestFormState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`delete-request-${record.id}`} title="حذف درخواست تعمیر" recordName={record.problem ?? "درخواست تعمیر"} identityLines={[{ label: "خودرو", value: `${record.vehicle.code} — ${record.vehicle.brandName} ${record.vehicle.modelName}` }, { label: "زمان ثبت", value: requestDateFormatter.format(new Date(record.requestedAt)) }]} message="این درخواست برای همیشه حذف شود؟ فقط درخواست بدون پروندهٔ تعمیر قابل حذف است و حذف قابل بازگشت نیست.">
    <form action={action} aria-busy={pending}><RequestFormFeedback state={state} /><FormActions separated><ActionButton type="submit" variant="danger" pending={pending}>{pending ? "در حال حذف…" : "حذف"}</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions></form>
  </ConfirmDialog>;
}
