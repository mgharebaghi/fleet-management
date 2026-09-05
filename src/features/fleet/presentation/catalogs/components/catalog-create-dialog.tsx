"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { Dialog } from "../../../../../components/ui/dialog/dialog";
import {
  FieldErrors,
  FieldLabel,
  FormActions,
  FormField,
  formControlClassName,
} from "../../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
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
        <FormField>
          <FieldLabel htmlFor={fieldId}>{nameLabel}</FieldLabel>
          <input
            className={formControlClassName}
            id={fieldId}
            name="name"
            type="text"
            required
            autoFocus
            disabled={isPending}
            aria-invalid={fieldErrors.length > 0}
            aria-describedby={fieldErrors.length > 0 ? errorId : undefined}
          />
          <FieldErrors id={errorId} messages={fieldErrors} />
        </FormField>

        {isPending && <LoadingIndicator label="در حال ثبت…" />}
        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage.text}
          </InlineNotice>
        )}

        <FormActions separated>
          <ActionButton
            type="submit"
            size="sm"
            disabled={isPending}
            pending={isPending}
          >
            {isPending ? submitPendingLabel : submitLabel}
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            انصراف
          </ActionButton>
        </FormActions>
      </form>
    </Dialog>
  );
}
