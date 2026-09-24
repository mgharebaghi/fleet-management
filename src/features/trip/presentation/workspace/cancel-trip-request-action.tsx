"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { cancelTripRequestAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import { formatTripDateTime } from "../trip-format";

export function CancelTripRequestAction({
  tripRequestId,
  requestNo,
  purpose,
  plannedAt,
}: {
  tripRequestId: number;
  requestNo: string;
  purpose: string | null;
  plannedAt: Date;
}) {
  const prefix = useId();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    cancelTripRequestAction.bind(null, tripRequestId),
    {},
  );

  return (
    <>
      <ActionButton
        type="button"
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        لغو درخواست
      </ActionButton>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={`${prefix}-cancel-title`}
        title="لغو درخواست سفر"
        tone="danger"
        recordName={requestNo}
        identityLines={[
          ...(purpose
            ? [{ label: "هدف سفر", value: purpose }]
            : []),
          { label: "زمان سفر", value: formatTripDateTime(plannedAt) },
        ]}
        message="این درخواست لغو می‌شود و با وضعیت «لغوشده» در سوابق می‌ماند. مسافران و اطلاعات ثبت‌شده حذف نمی‌شوند. برنامه‌های شروع‌نشده هم لغو می‌شوند."
      >
        {state.error && (
          <InlineNotice tone="danger" role="alert">
            {tripMessages[state.error]}
          </InlineNotice>
        )}
        <form action={formAction}>
          <FormActions>
            <ActionButton
              type="submit"
              variant="danger"
              disabled={pending}
              pending={pending}
            >
              {pending ? "در حال لغو…" : "لغو درخواست"}
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              ادامه درخواست
            </ActionButton>
          </FormActions>
        </form>
      </ConfirmDialog>
    </>
  );
}
