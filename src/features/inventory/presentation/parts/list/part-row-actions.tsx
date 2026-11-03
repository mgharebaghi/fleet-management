"use client";

import { useActionState, useEffect, useState } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { IconActionButton, IconActionGroup, IconActionLink } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { DeleteIcon, EditIcon, ViewIcon } from "../../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import { deletePartAction, type DeletePartState } from "./delete-part.action";

export function PartRowActions({ part }: { part: { id: number; name: string; code: string } }) {
  const [open, setOpen] = useState(false);
  return <>
    <IconActionGroup>
      <IconActionLink label={`مشاهده پروندهٔ ${part.name}`} icon={<ViewIcon />} href={`/inventory/parts/${part.id}`} />
      <IconActionLink label={`ویرایش ${part.name}`} icon={<EditIcon />} href={`/inventory/parts/${part.id}/edit`} />
      <IconActionButton label={`حذف ${part.name}`} icon={<DeleteIcon />} tone="danger" onClick={() => setOpen(true)} />
    </IconActionGroup>
    {open && <DeletePartDialog part={part} onClose={() => setOpen(false)} />}
  </>;
}

function DeletePartDialog({ part, onClose }: { part: { id: number; name: string; code: string }; onClose: () => void }) {
  const [state, action, pending] = useActionState(deletePartAction.bind(null, part.id), {} as DeletePartState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`delete-part-${part.id}`} title="حذف قطعه" recordName={part.name} identityLines={[{ label: "کد قطعه", value: part.code }]} message="این قطعه حذف شود؟ قطعه‌ای که سابقه یا وابستگی دارد قابل حذف نیست.">
    <form action={action} aria-busy={pending}>
      {state.message && <InlineNotice role="alert" tone="danger">{state.message}</InlineNotice>}
      <FormActions separated>
        <ActionButton type="submit" variant="danger" pending={pending}>{pending ? "در حال حذف…" : "حذف"}</ActionButton>
        <ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton>
      </FormActions>
    </form>
  </ConfirmDialog>;
}
