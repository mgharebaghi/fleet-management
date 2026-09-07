"use client";

import { useActionState } from "react";

import { ActionButton } from "../../../../components/ui/action-button/action-button";
import type { ConfirmDialogIdentityLine } from "../../../../components/ui/confirm-dialog/confirm-dialog";
import { ConfirmDialog } from "../../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../../components/ui/form-field/form-field";
import { InlineNotice } from "../../../../components/ui/inline-notice/inline-notice";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import { deletePersonAction } from "./delete-person.action";
import { initialDeletePersonActionState } from "./delete-person.action-state";
import { getDeletePersonStatusMessage } from "./delete-person.messages";

export type DeletePersonDialogProps = {
  open: boolean;
  onClose: () => void;
  personId: number;
  personFullName: string;
  /** Shown under the name so people with the same name are told apart. */
  personnelNo: string | null;
  nationalCode: string | null;
};

/**
 * Confirms deleting a person by their name — never by the row's database id —
 * with their identifying codes underneath. A delete the database refuses
 * (the person still has a driver record) is reported here in Persian.
 */
export function DeletePersonDialog({
  open,
  onClose,
  personId,
  personFullName,
  personnelNo,
  nationalCode,
}: DeletePersonDialogProps) {
  const [actionState, formAction, isPending] = useActionState(
    deletePersonAction,
    initialDeletePersonActionState,
  );
  const statusMessage = getDeletePersonStatusMessage(actionState);

  const identityLines: ConfirmDialogIdentityLine[] = [];
  if (personnelNo) {
    identityLines.push({
      label: "شمارهٔ پرسنلی",
      value: <TechnicalValue>{personnelNo}</TechnicalValue>,
    });
  }
  if (nationalCode) {
    identityLines.push({
      label: "کد ملی",
      value: <TechnicalValue>{nationalCode}</TechnicalValue>,
    });
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      titleId="delete-person-title"
      title="حذف شخص"
      recordName={personFullName}
      identityLines={identityLines}
      message={`آیا از حذف «${personFullName}» مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`}
    >
      <form action={formAction} aria-busy={isPending} noValidate>
        <input type="hidden" name="personId" value={personId} />

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
            {isPending ? "در حال حذف…" : "حذف شخص"}
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
