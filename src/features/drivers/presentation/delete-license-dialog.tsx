"use client";

import { useActionState, useId, useState } from "react";
import { ActionButton } from "../../../components/ui/action-button/action-button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "../../../components/ui/form-field/form-field";
import { DeleteIcon } from "../../../components/ui/icon/icons";
import { IconActionButton } from "../../../components/ui/icon-action-button/icon-action-button";
import { InlineNotice } from "../../../components/ui/inline-notice/inline-notice";
import { TechnicalValue } from "../../../components/ui/technical-value/technical-value";
import { deleteLicenseAction } from "./driver.actions";
import { driverMessages, type DriverActionState } from "./driver-form-data";

type Props = {
  driverId: number;
  licenseId: number;
  licenseType: string;
  licenseNo: string;
};

export function DeleteLicenseButton({ driverId, licenseId, licenseType, licenseNo }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = `${useId()}-delete-license-title`;
  const [state, action, pending] = useActionState(
    deleteLicenseAction.bind(null, driverId),
    {} satisfies DriverActionState,
  );

  return <>
    <IconActionButton label={`حذف گواهینامه ${licenseType}`} icon={<DeleteIcon />} tone="danger" onClick={() => setOpen(true)} />
    <ConfirmDialog
      open={open}
      onClose={() => setOpen(false)}
      titleId={titleId}
      title="حذف گواهینامه"
      recordName={`گواهینامه ${licenseType}`}
      identityLines={[{ label: "شمارهٔ گواهینامه", value: <TechnicalValue>{licenseNo}</TechnicalValue> }]}
      message="آیا از حذف این گواهینامه مطمئن هستید؟ این عملیات غیرقابل بازگشت است."
    >
      <form action={action} aria-busy={pending} noValidate>
        <input type="hidden" name="licenseId" value={licenseId} />
        {state.error && <InlineNotice tone="danger" role="alert">{driverMessages[state.error]}</InlineNotice>}
        <FormActions separated>
          <ActionButton type="submit" variant="danger" size="sm" disabled={pending} pending={pending}>{pending ? "در حال حذف…" : "حذف گواهینامه"}</ActionButton>
          <ActionButton variant="secondary" size="sm" disabled={pending} onClick={() => setOpen(false)}>انصراف</ActionButton>
        </FormActions>
      </form>
    </ConfirmDialog>
  </>;
}
