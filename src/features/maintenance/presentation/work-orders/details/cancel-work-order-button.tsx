"use client";
import { useEffect, useState } from "react";
import { IconActionButton } from "@/components/ui/icon-action-button/icon-action-button";
import { CancelIcon } from "@/components/ui/icon/icons";
import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions, FormField, FieldLabel, FieldErrors, formControlClassName } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { useEditableActionState } from "@/shared/presentation/use-editable-action-state";
import { cancelWorkOrderAction, type CancelWorkOrderState } from "./cancel-work-order.action";
const messages = {
  INVALID_ID: "شناسهٔ پرونده معتبر نیست.", NOT_FOUND: "پرونده پیدا نشد.", ORDER_CLOSED: "پرونده قبلاً بسته شده است.",
  UNKNOWN_STATE: "وضعیت پرونده یا کارهای آن نامشخص است؛ لغو ممکن نیست.",
  REASON_REQUIRED: "علت توقف تعمیر را وارد کنید.", REASON_TOO_LONG: "مجموع نتیجهٔ قبلی و علت لغو نباید بیشتر از ۱۰۰۰ نویسه باشد.", UNAVAILABLE: "لغو پرونده انجام نشد؛ دوباره تلاش کنید.",
};
export function CancelWorkOrderButton({ id, number, started, compact = false }: { id: number; number: string; started: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>{compact ? <IconActionButton label={`لغو پرونده ${number}`} icon={<CancelIcon />} tone="danger" onClick={() => setOpen(true)} /> : <ActionButton variant="danger" onClick={() => setOpen(true)}>لغو پروندهٔ تعمیر</ActionButton>}
    {open && <CancellationDialog id={id} number={number} started={started} onClose={() => setOpen(false)} />}</>;
}
function CancellationDialog({ id, number, started, onClose }: { id: number; number: string; started: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [state, action, pending, onInput, submitted] = useEditableActionState(cancelWorkOrderAction.bind(null, id), {} as CancelWorkOrderState, { REASON_REQUIRED: ["reason"], REASON_TOO_LONG: ["reason"] });
  useEffect(() => { if (submitted.saved && !pending) onClose(); }, [submitted, pending, onClose]);
  const fieldError = state.error === "REASON_REQUIRED" || state.error === "REASON_TOO_LONG";
  return <ConfirmDialog open onClose={() => { if (!pending) onClose(); }} titleId="cancel-repair-order" title="لغو پروندهٔ تعمیر" recordName={number} message="کارهای ناتمام لغو می‌شوند؛ کارهای انجام‌شده، اجرت‌ها و سوابق حفظ می‌شوند.">
    <form action={action} onInputCapture={onInput} noValidate aria-busy={pending}>
      <FormField><FieldLabel htmlFor="cancel-order-reason" required={started}>{started ? "علت توقف تعمیر" : "علت لغو"}</FieldLabel>
        <textarea id="cancel-order-reason" name="reason" value={reason} onChange={event => setReason(event.target.value)} rows={3} required={started} className={formControlClassName} disabled={pending} aria-invalid={fieldError} aria-describedby="cancel-order-error" />
        <FieldErrors id="cancel-order-error" messages={fieldError ? [messages[state.error!]] : []} />
      </FormField>
      {state.error && !fieldError && <InlineNotice role="alert" tone="danger">{messages[state.error]}</InlineNotice>}
      <FormActions separated><ActionButton type="submit" variant="danger" pending={pending}>تأیید لغو پرونده</ActionButton><ActionButton variant="secondary" disabled={pending} onClick={onClose}>انصراف</ActionButton></FormActions>
    </form>
  </ConfirmDialog>;
}
