"use client";

import { useActionState, useId } from "react";

import { ActionButton } from "@/components/ui/action-button/action-button";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type { TripRequestDetails } from "../../application/trip-records";
import { changeTripRequestStatusAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import { CancelTripRequestAction } from "./cancel-trip-request-action";
import styles from "./trip-workspace.module.css";
import type { TripWorkspaceView } from "./trip-workspace-view";

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

  if (!showPrimary) return null;

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
          <div className={styles.statusCancelAction}>
            <CancelTripRequestAction
              tripRequestId={view.tripRequestId}
              requestNo={view.requestNo}
              purpose={view.purpose}
              plannedAt={view.plannedAt}
            />
          </div>
        )}
      </div>
    </div>
  );
}
