"use client";
import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../components/ui/form-field/form-field";
import { IconActionButton, IconActionGroup, IconActionLink } from "../../../../components/ui/icon-action-button/icon-action-button";
import { DeleteIcon, EditIcon, ViewIcon } from "../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import type { MaintenanceTypeListItem } from "../../application/reference-data/maintenance-reference-records";
import { deleteMaintenanceTypeAction, type DeleteMaintenanceTypeState } from "./delete-maintenance-type.action";

export function MaintenanceTypeRowActions({ record }: { record: MaintenanceTypeListItem }) {
  const [open, setOpen] = useState(false);
  return <><IconActionGroup>
    <IconActionLink label={`مشاهده پروندهٔ ${record.name}`} href={`/maintenance/catalogs/${record.id}`} icon={<ViewIcon />} />
    <IconActionLink label={`ویرایش ${record.name}`} href={`/maintenance/catalogs/${record.id}/edit`} icon={<EditIcon />} />
    <IconActionButton label={record.isUsed ? `حذف ${record.name} امکان‌پذیر نیست؛ این نوع تعمیر و سرویس استفاده شده است` : `حذف ${record.name}`} icon={<DeleteIcon />} tone="danger" disabled={record.isUsed} onClick={() => setOpen(true)} />
  </IconActionGroup>{open && <DeleteMaintenanceTypeDialog record={record} onClose={() => setOpen(false)} />}</>;
}
function DeleteMaintenanceTypeDialog({ record, onClose }: { record: MaintenanceTypeListItem; onClose: () => void }) {
  const [state, action, pending] = useActionState(deleteMaintenanceTypeAction.bind(null, record.id), {} as DeleteMaintenanceTypeState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`delete-maintenance-type-${record.id}`} title="حذف نوع تعمیر و سرویس" recordName={record.name} identityLines={[{ label: "کد", value: record.code }]} message="این نوع تعمیر و سرویس حذف شود؟ فقط مواردی که در درخواست تعمیر، پروندهٔ تعمیر یا برنامهٔ سرویس استفاده نشده‌اند قابل حذف هستند.">
    <form action={action} aria-busy={pending}>{state.message && <InlineNotice role="alert" tone="danger">{state.message}</InlineNotice>}<FormActions separated><ActionButton type="submit" variant="danger" pending={pending}>{pending ? "در حال حذف…" : "حذف"}</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions></form>
  </ConfirmDialog>;
}
