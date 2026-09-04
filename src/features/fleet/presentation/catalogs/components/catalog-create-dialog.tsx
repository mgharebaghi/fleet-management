"use client";

import { useActionState, useEffect, useRef } from "react";

import { Dialog } from "../../../../../components/ui/dialog/dialog";
import { LoadingIndicator } from "../../../../../components/ui/loading-indicator/loading-indicator";
import type { CreateCatalogEntryActionState } from "../create-catalog-entry/create-catalog-entry.action-state";
import { initialCreateCatalogEntryActionState } from "../create-catalog-entry/create-catalog-entry.action-state";
import {
  getCreateCatalogEntryFieldErrorMessages,
  getCreateCatalogEntryStatusMessage,
} from "../create-catalog-entry/create-catalog-entry.messages";
import styles from "./catalog-create-dialog.module.css";

type CreateCatalogEntryAction = (
  previousState: CreateCatalogEntryActionState,
  formData: FormData,
) => Promise<CreateCatalogEntryActionState>;

export type CatalogCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  fieldId: string;
  title: string;
  nameLabel: string;
  submitLabel: string;
  submitPendingLabel: string;
  duplicateMessage: string;
  action: CreateCatalogEntryAction;
};

export function CatalogCreateDialog({
  open,
  onClose,
  fieldId,
  title,
  nameLabel,
  submitLabel,
  submitPendingLabel,
  duplicateMessage,
  action,
}: CatalogCreateDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    action,
    initialCreateCatalogEntryActionState,
  );
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (isPending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current && actionState.status === "idle") {
      wasPendingRef.current = false;
      onClose();
    }
  }, [isPending, actionState, onClose]);

  const fieldErrors = getCreateCatalogEntryFieldErrorMessages(actionState);
  const statusMessage = getCreateCatalogEntryStatusMessage(
    actionState,
    duplicateMessage,
  );
  const dialogTitleId = `${fieldId}-create-title`;
  const errorId = `${fieldId}-error`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={dialogTitleId}
      title={`افزودن ${title}`}
    >
      <form
        action={formAction}
        className={styles.form}
        aria-busy={isPending}
        noValidate
      >
        <div className={styles.field}>
          <label htmlFor={fieldId}>{nameLabel}</label>
          <input
            id={fieldId}
            name="name"
            type="text"
            required
            autoFocus
            disabled={isPending}
            aria-invalid={fieldErrors.length > 0}
            aria-describedby={fieldErrors.length > 0 ? errorId : undefined}
          />
          {fieldErrors.length > 0 && (
            <div id={errorId} className={styles.fieldErrors} role="alert">
              {fieldErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
        </div>

        {isPending && <LoadingIndicator label="در حال ثبت…" />}
        {statusMessage && (
          <p className={styles.formError} role="alert">
            {statusMessage.text}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isPending}
          >
            {isPending ? submitPendingLabel : submitLabel}
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={isPending}
          >
            انصراف
          </button>
        </div>
      </form>
    </Dialog>
  );
}
