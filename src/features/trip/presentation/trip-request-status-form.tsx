"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import {
  everyPassengerExecutionCompleted,
  everyPassengerHasPersistedPlan,
  requestHasStartedExecution,
} from "../application/trip-lifecycle";
import type { TripRequestDetails } from "../application/trip-records";
import { changeTripRequestStatusAction } from "./trip.actions";
import { tripMessages } from "./trip-form-data";
import { requestStatusLabel } from "./trip-status";
import styles from "./trip-forms.module.css";

function lifecycleSnapshot(details: TripRequestDetails) {
  return {
    status: details.status,
    passengers: details.passengers.map((trip) => ({
      tripId: trip.tripId,
      executions: trip.executions.map((execution) => ({
        tripExecutionId: execution.tripExecutionId,
        status: execution.status,
        actualPickupDateTime: execution.actualPickupDateTime,
      })),
    })),
  };
}

export function TripRequestStatusForm({
  details,
}: {
  details: TripRequestDetails;
}) {
  const [state, formAction, pending] = useActionState(
    changeTripRequestStatusAction.bind(null, details.tripRequestId),
    {},
  );
  const prefix = useId();
  const [cancelOpen, setCancelOpen] = useState(false);
  const snapshot = lifecycleSnapshot(details);
  const started = requestHasStartedExecution(snapshot);
  const canAssign = everyPassengerHasPersistedPlan(snapshot);
  const canStart = started;
  const canComplete = everyPassengerExecutionCompleted(snapshot);
  const canCancel =
    (details.status === "New" || details.status === "Assigned") && !started;

  if (
    details.status === "Completed" ||
    details.status === "Cancelled"
  ) {
    return (
      <p className={styles.hint}>
        این درخواست {requestStatusLabel(details.status)} است و وضعیت آن دیگر
        تغییر نمی‌کند.
      </p>
    );
  }

  return (
    <div className={styles.detailForm}>
      <h3>اقدام‌های وضعیت درخواست</h3>
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <div className={styles.actionRow}>
        {details.status === "New" && (
          <form action={formAction}>
            <input type="hidden" name="requestStatus" value="Assigned" />
            <ActionButton
              type="submit"
              disabled={pending || !canAssign}
              pending={pending}
            >
              ثبت تخصیص‌یافته
            </ActionButton>
            {!canAssign && (
              <p className={styles.hint}>
                ابتدا در بخش «خودرو و راننده» تخصیص هر مسافر را ثبت کنید.
              </p>
            )}
          </form>
        )}
        {details.status === "Assigned" && (
          <form action={formAction}>
            <input type="hidden" name="requestStatus" value="InProgress" />
            <ActionButton
              type="submit"
              disabled={pending || !canStart}
              pending={pending}
            >
              شروع درخواست
            </ActionButton>
            {!canStart && (
              <p className={styles.hint}>
                ابتدا زمان واقعی حرکت را در بخش اجراء ثبت کنید.
              </p>
            )}
          </form>
        )}
        {details.status === "InProgress" && (
          <form action={formAction}>
            <input type="hidden" name="requestStatus" value="Completed" />
            <ActionButton
              type="submit"
              disabled={pending || !canComplete}
              pending={pending}
            >
              تکمیل درخواست
            </ActionButton>
            {!canComplete && (
              <p className={styles.hint}>
                اجرای همهٔ مسافران باید تکمیل شده باشد.
              </p>
            )}
          </form>
        )}
        {canCancel && (
          <>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setCancelOpen(true)}
            >
              لغو درخواست
            </ActionButton>
            <ConfirmDialog
              open={cancelOpen}
              onClose={() => setCancelOpen(false)}
              titleId={`${prefix}-cancel-title`}
              title="لغو درخواست سفر"
              tone="danger"
              recordName={details.requestNo}
              message="برنامه‌های ثبت‌شدهٔ شروع‌نشده هم لغو می‌شوند. این کار برگشت‌پذیر نیست."
            >
              <form action={formAction}>
                <input type="hidden" name="requestStatus" value="Cancelled" />
                <FormActions separated>
                  <ActionButton type="submit" disabled={pending} pending={pending}>
                    تأیید لغو
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => setCancelOpen(false)}
                  >
                    انصراف
                  </ActionButton>
                </FormActions>
              </form>
            </ConfirmDialog>
          </>
        )}
      </div>
    </div>
  );
}
