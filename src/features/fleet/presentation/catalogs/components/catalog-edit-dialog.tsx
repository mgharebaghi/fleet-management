"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import { ConfirmedSubmitButton } from "../../../../../components/ui/confirmed-submit/confirmed-submit-button";
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
import type { UpdateCatalogEntryActionState } from "../update-catalog-entry/update-catalog-entry.action-state";
import { initialUpdateCatalogEntryActionState } from "../update-catalog-entry/update-catalog-entry.action-state";
import {
  getUpdateCatalogEntryFieldErrorMessages,
  getUpdateCatalogEntryStatusMessage,
} from "../update-catalog-entry/update-catalog-entry.messages";
import type { CatalogEntryView } from "./catalog-entry-view";
import styles from "./catalog-edit-dialog.module.css";

type UpdateCatalogEntryAction = (
  previousState: UpdateCatalogEntryActionState,
  formData: FormData,
) => Promise<UpdateCatalogEntryActionState>;

export type CatalogEditDialogProps = {
  open: boolean;
  onClose: () => void;
  fieldId: string;
  title: string;
  nameLabel: string;
  duplicateMessage: string;
  entry: CatalogEntryView;
  /** false for catalogs (like VehicleStatus) with no IsActive column. */
  supportsActiveToggle: boolean;
  action: UpdateCatalogEntryAction;
};

export function CatalogEditDialog({
  open,
  onClose,
  fieldId,
  title,
  nameLabel,
  duplicateMessage,
  entry,
  supportsActiveToggle,
  action,
}: CatalogEditDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    action,
    initialUpdateCatalogEntryActionState,
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

  const fieldErrors = getUpdateCatalogEntryFieldErrorMessages(actionState);
  const statusMessage = getUpdateCatalogEntryStatusMessage(
    actionState,
    duplicateMessage,
  );
  const dialogTitleId = `${fieldId}-edit-title`;
  const errorId = `${fieldId}-edit-error`;
  const activeFieldId = `${fieldId}-edit-active`;
  const formId = `${fieldId}-edit-form`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={dialogTitleId}
      title={`ویرایش ${title}`}
    >
      <form
        id={formId}
        action={formAction}
        className={styles.form}
        aria-busy={isPending}
        noValidate
      >
        <input type="hidden" name="id" value={entry.id} />
        <input
          type="hidden"
          name="supportsActive"
          value={supportsActiveToggle ? "true" : "false"}
        />

        <FormField>
          <FieldLabel htmlFor={fieldId}>{nameLabel}</FieldLabel>
          <input
            className={formControlClassName}
            id={fieldId}
            name="name"
            type="text"
            required
            autoFocus
            defaultValue={entry.name}
            disabled={isPending}
            aria-invalid={fieldErrors.length > 0}
            aria-describedby={fieldErrors.length > 0 ? errorId : undefined}
          />
          <FieldErrors id={errorId} messages={fieldErrors} />
        </FormField>

        {supportsActiveToggle && (
          <FormField>
            <label className={styles.checkboxRow} htmlFor={activeFieldId}>
              <input
                id={activeFieldId}
                name="isActive"
                type="checkbox"
                defaultChecked={entry.isActive ?? true}
                disabled={isPending}
              />
              فعال
            </label>
          </FormField>
        )}

        {isPending && <LoadingIndicator label="در حال ذخیره…" />}
        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage.text}
          </InlineNotice>
        )}

        <FormActions separated>
          <ConfirmedSubmitButton
            formId={formId}
            titleId={`${fieldId}-edit-confirm-title`}
            dialogTitle="ذخیره تغییرات"
            recordName={entry.name}
            identityLines={[{ label: "دستهٔ اطلاعات پایه", value: title }]}
            message={`آیا از ذخیره تغییرات این ${title} مطمئن هستید؟`}
            label="ذخیره تغییرات"
            pendingLabel="در حال ذخیره…"
            confirmLabel="تأیید و ذخیره"
            pending={isPending}
            size="sm"
          />
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
