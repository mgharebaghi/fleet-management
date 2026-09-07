"use client";

import { useActionState, useEffect, useRef } from "react";

import { ActionButton } from "../../../../../components/ui/action-button/action-button";
import type { ConfirmDialogIdentityLine } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmDialog } from "../../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../../components/ui/inline-notice/inline-notice";
import type { DeleteCatalogEntryActionState } from "../delete-catalog-entry/delete-catalog-entry.action-state";
import { initialDeleteCatalogEntryActionState } from "../delete-catalog-entry/delete-catalog-entry.action-state";
import { getDeleteCatalogEntryStatusMessage } from "../delete-catalog-entry/delete-catalog-entry.messages";
import type { CatalogEntryView } from "./catalog-entry-view";

type DeleteCatalogEntryAction = (
  previousState: DeleteCatalogEntryActionState,
  formData: FormData,
) => Promise<DeleteCatalogEntryActionState>;

export type CatalogDeleteDialogProps = {
  open: boolean;
  onClose: () => void;
  fieldId: string;
  title: string;
  entry: CatalogEntryView;
  /** Persian explanation shown when the database rejects the delete via a foreign key. */
  inUseMessage: string;
  /**
   * Replaces the default category line for catalogs whose records need more
   * than their own name to be told apart (a model also names its brand).
   */
  identityLines?: ConfirmDialogIdentityLine[];
  action: DeleteCatalogEntryAction;
};

export function CatalogDeleteDialog({
  open,
  onClose,
  fieldId,
  title,
  entry,
  inUseMessage,
  identityLines,
  action,
}: CatalogDeleteDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    action,
    initialDeleteCatalogEntryActionState,
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

  const statusMessage = getDeleteCatalogEntryStatusMessage(
    actionState,
    inUseMessage,
  );
  const dialogTitleId = `${fieldId}-delete-title`;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      titleId={dialogTitleId}
      title={`حذف ${title}`}
      recordName={entry.name}
      identityLines={
        identityLines ?? [{ label: "دستهٔ اطلاعات پایه", value: title }]
      }
      message={`آیا از حذف ${title} «${entry.name}» مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`}
    >
      <form action={formAction} aria-busy={isPending} noValidate>
        <input type="hidden" name="id" value={entry.id} />

        {statusMessage && (
          <InlineNotice tone="danger" role="alert">
            {statusMessage.text}
          </InlineNotice>
        )}

        <FormActions separated>
          <ActionButton
            type="submit"
            variant="danger"
            size="sm"
            disabled={isPending}
            pending={isPending}
          >
            {isPending ? "در حال حذف…" : "حذف"}
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
    </ConfirmDialog>
  );
}
