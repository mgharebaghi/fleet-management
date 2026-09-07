"use client";

import { useActionState, useId, useState } from "react";
import { ActionButton } from "../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../components/ui/form-field/form-field";
import { DeleteIcon } from "../../../components/ui/icon/icons";
import { IconActionButton } from "../../../components/ui/icon-action-button/icon-action-button";
import { InlineNotice } from "../../../components/ui/inline-notice/inline-notice";
import { deleteAssignmentAction } from "./driver.actions";
import { driverMessages, type DriverActionState } from "./driver-form-data";

type Props = {
  driverId: number;
  assignmentId: number;
  vehicleLabel: string;
};

export function DeleteAssignmentButton({ driverId, assignmentId, vehicleLabel }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = `${useId()}-delete-assignment-title`;
  const [state, action, pending] = useActionState(
    deleteAssignmentAction.bind(null, driverId, assignmentId),
    {} satisfies DriverActionState,
  );

  return <>
    <IconActionButton label={`حذف تخصیص ${vehicleLabel}`} icon={<DeleteIcon />} tone="danger" onClick={() => setOpen(true)} />
    <ConfirmDialog
      open={open}
      onClose={() => setOpen(false)}
      titleId={titleId}
      title="حذف تخصیص"
      recordName={`تخصیص ${vehicleLabel}`}
      message="آیا از حذف این تخصیص مطمئن هستید؟ این عملیات غیرقابل بازگشت است و برای تخصیص‌های پایان‌یافته امکان‌پذیر نیست."
    >
      <form action={action} aria-busy={pending} noValidate>
        {state.error && <InlineNotice tone="danger" role="alert">{driverMessages[state.error]}</InlineNotice>}
        <FormActions separated>
          <ActionButton type="submit" variant="danger" size="sm" disabled={pending} pending={pending}>{pending ? "در حال حذف…" : "حذف تخصیص"}</ActionButton>
          <ActionButton variant="secondary" size="sm" disabled={pending} onClick={() => setOpen(false)}>انصراف</ActionButton>
        </FormActions>
      </form>
    </ConfirmDialog>
  </>;
}
