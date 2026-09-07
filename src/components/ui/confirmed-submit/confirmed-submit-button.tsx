"use client";

import { useEffect, useRef, useState } from "react";

import { ActionButton } from "../action-button/action-button";
import type { ConfirmDialogIdentityLine } from "../confirm-dialog/confirm-dialog";
import { ConfirmDialog } from "../confirm-dialog/confirm-dialog";
import { FormActions } from "../form-field/form-field";

export type ConfirmedSubmitButtonProps = {
  /**
   * The id of the form this button submits. The button lives outside that
   * form (inside the confirmation dialog), so it names its target instead of
   * relying on where it sits in the DOM.
   */
  formId: string;
  titleId: string;
  dialogTitle: string;
  /** The edited record's human-readable name, echoed back before saving. */
  recordName: string;
  identityLines?: ConfirmDialogIdentityLine[];
  message: string;
  label: string;
  pendingLabel: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** True while the submitted action is running. */
  pending: boolean;
  disabled?: boolean;
  /** Matches the surrounding form's button scale; "sm" suits dialogs. */
  size?: "sm" | "md";
};

/**
 * Turns a form's save control into a two-step action: the visible button only
 * opens a confirmation, and the form is submitted from inside that dialog.
 *
 * The form itself is untouched — same action, same server-side validation,
 * same states — so this adds a deliberate pause without moving any rule into
 * the button.
 */
export function ConfirmedSubmitButton({
  formId,
  titleId,
  dialogTitle,
  recordName,
  identityLines,
  message,
  label,
  pendingLabel,
  confirmLabel,
  cancelLabel = "انصراف",
  pending,
  disabled = false,
  size = "md",
}: ConfirmedSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const wasPendingRef = useRef(false);

  // Keep the confirmation up while the save runs so its spinner is the one
  // the user is already looking at, then dismiss it once the action settles.
  // A successful save navigates away; a rejected one leaves the form's own
  // messages visible underneath.
  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current) {
      wasPendingRef.current = false;
      setOpen(false);
    }
  }, [pending]);

  return (
    <>
      <ActionButton
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled || pending}
        pending={pending}
      >
        {pending ? pendingLabel : label}
      </ActionButton>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={dialogTitle}
        tone="primary"
        recordName={recordName}
        identityLines={identityLines}
        message={message}
      >
        <FormActions separated>
          <ActionButton
            type="submit"
            form={formId}
            size="sm"
            disabled={pending}
            pending={pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </ActionButton>
        </FormActions>
      </ConfirmDialog>
    </>
  );
}
