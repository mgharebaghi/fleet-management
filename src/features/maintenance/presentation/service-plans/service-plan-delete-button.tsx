"use client";
import { useActionState, useState } from "react";
import { ActionButton } from "../../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../components/ui/form-field/form-field";
import { IconActionButton } from "../../../../components/ui/icon-action-button/icon-action-button";
import { DeleteIcon } from "../../../../components/ui/icon/icons";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { deleteServicePlanAction } from "./delete-service-plan.action";
import { planFailureMessages, type PlanFormState } from "./service-plan-presentation";
export function ServicePlanDeleteButton({ id, title, orderCount, icon = true }: { id: number; title: string; orderCount: number; icon?: boolean }) {
  const [open, setOpen] = useState(false);
  const label = orderCount ? "حذف ممکن نیست؛ برنامه پروندهٔ مرتبط دارد" : `حذف برنامهٔ ${title}`;
  return <>{icon ? <IconActionButton label={label} icon={<DeleteIcon />} tone="danger" disabled={orderCount > 0} onClick={() => setOpen(true)} /> : <ActionButton variant="danger" disabled={orderCount > 0} onClick={() => setOpen(true)}>حذف برنامه</ActionButton>}{open && <DeletePlanDialog id={id} title={title} onClose={() => setOpen(false)} />}</>;
}
function DeletePlanDialog({ id, title, onClose }: { id: number; title: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(deleteServicePlanAction.bind(null, id), {} as PlanFormState);
  const message = state.unavailable ? "حذف برنامه امکان‌پذیر نبود؛ دوباره تلاش کنید." : state.error && state.error.type !== "VALIDATION_ERROR" ? planFailureMessages[state.error.type] : null;
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`delete-plan-${id}`} title="حذف برنامهٔ سرویس" recordName={title} message="این برنامه برای همیشه حذف شود؟ حذف قابل بازگشت نیست."><form action={action} aria-busy={pending}>{message && <InlineNotice tone="danger" role="alert">{message}</InlineNotice>}<FormActions separated><ActionButton type="submit" variant="danger" pending={pending}>حذف برنامه</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions></form></ConfirmDialog>;
}
