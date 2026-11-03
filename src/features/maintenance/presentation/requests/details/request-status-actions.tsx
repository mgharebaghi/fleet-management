"use client";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { IconActionButton } from "../../../../../components/ui/icon-action-button/icon-action-button";
import { CancelIcon } from "../../../../../components/ui/icon/icons";
import { requestIsEditable } from "../../../application/requests/maintenance-request-records";
import { RequestFormFeedback } from "../shared/request-form-feedback";
import type { RequestFormState } from "../shared/request-form-state";
import { changeRequestStatusAction } from "./change-request-status.action";
const actionLabels: Record<string, string> = { InProgress: "شروع پیگیری", Completed: "بستن درخواست", Cancelled: "لغو درخواست" };
export function RequestStatusActions({ id, status, compact = false, children }: { id: number; status: string; compact?: boolean; children?: ReactNode }) {
  const [target, setTarget] = useState<string | null>(null);
  if (!requestIsEditable(status)) return null;
  const actions = compact ? <>
    <IconActionButton label={`لغو درخواست — درخواست ${id}`} icon={<CancelIcon />} tone="danger" onClick={() => setTarget("Cancelled")} />
  </> : <FormActions layout="stacked">{children}{status === "Open" && <ActionButton variant="secondary" onClick={() => setTarget("InProgress")}>شروع پیگیری</ActionButton>}<ActionButton variant="secondary" onClick={() => setTarget("Completed")}>بستن درخواست</ActionButton><ActionButton variant="danger" onClick={() => setTarget("Cancelled")}>لغو درخواست</ActionButton></FormActions>;
  return <>{actions}{target && <RequestStatusDialog id={id} target={target} onClose={() => setTarget(null)} />}</>;
}
function RequestStatusDialog({ id, target, onClose }: { id: number; target: string; onClose: () => void }) {
  const [state, action, pending] = useActionState(changeRequestStatusAction.bind(null, id, target), {} as RequestFormState);
  useEffect(() => { if (state.saved && !pending) onClose(); }, [state, pending, onClose]);
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId={`request-status-${id}`} title={actionLabels[target]} recordName={`درخواست ${id}`} message={target === "InProgress" ? "پیگیری درخواست آغاز شود؟ این تغییر به معنی شروع تعمیر خودرو نیست." : "وضعیت درخواست تغییر کند؟ این کار فقط پس از تعیین تکلیف همهٔ پرونده‌های مرتبط ممکن است و درخواست بسته یا لغوشده بازگشایی نمی‌شود."}>
    <form action={action} aria-busy={pending}><RequestFormFeedback state={state} /><FormActions separated><ActionButton type="submit" variant={target === "Cancelled" ? "danger" : "primary"} pending={pending}>{pending ? "در حال ثبت…" : "تأیید"}</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions></form>
  </ConfirmDialog>;
}
