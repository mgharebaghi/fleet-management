"use client";

import { useActionState, useId, useState } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog/confirm-dialog";
import { FormActions } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type { TripRequestDetails } from "../../application/trip-records";
import { changeTripRequestStatusAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import styles from "./trip-workspace.module.css";
import type { TripNextAction, TripWorkspaceView } from "./trip-workspace-view";

export function TripRequestStatusControl({
  details,
  view,
  compact = false,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    changeTripRequestStatusAction.bind(null, details.tripRequestId),
    {},
  );
  const prefix = useId();
  const [cancelOpen, setCancelOpen] = useState(false);
  const action = view.nextAction;
  const statusValue =
    action.id === "mark-assigned"
      ? "Assigned"
      : action.id === "mark-in-progress"
        ? "InProgress"
        : action.id === "complete-request"
          ? "Completed"
          : null;

  const showPrimary =
    statusValue !== null ||
    action.id === "plan-assignment" ||
    action.id === "record-departure" ||
    action.id === "record-return" ||
    action.id === "view-details";

  if (!showPrimary && !view.canCancel) return null;

  return (
    <div
      className={compact ? styles.statusControlCompact : styles.statusControl}
      aria-labelledby={`${prefix}-status`}
    >
      {!compact && (
        <div className={styles.statusCopy}>
          <h3 id={`${prefix}-status`}>اقدام درخواست</h3>
          {action.hint && <p>{action.hint}</p>}
        </div>
      )}
      {state.error && (
        <InlineNotice tone="danger" role="alert">
          {tripMessages[state.error]}
        </InlineNotice>
      )}
      <div className={styles.statusActions}>
        {statusValue ? (
          <form action={formAction}>
            <input type="hidden" name="requestStatus" value={statusValue} />
            <ActionButton
              type="submit"
              disabled={pending || !action.enabled}
              pending={pending}
            >
              {pending ? "در حال ثبت…" : action.label}
            </ActionButton>
          </form>
        ) : (
          action.id !== "plan-assignment" &&
          action.id !== "record-departure" &&
          action.id !== "record-return" && (
            <p className={styles.muted}>{action.label}</p>
          )
        )}
        {view.canCancel && (
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
                  <ActionButton
                    type="submit"
                    disabled={pending}
                    pending={pending}
                  >
                    {pending ? "در حال ثبت…" : "تأیید لغو"}
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

export function shouldShowStatusControl(
  action: TripNextAction,
  section: "planning" | "execution" | "completion",
): boolean {
  switch (section) {
    case "planning":
      return action.id === "mark-assigned";
    case "execution":
      return action.id === "mark-in-progress";
    case "completion":
      return action.id === "complete-request" || action.id === "view-details";
    default:
      return false;
  }
}
