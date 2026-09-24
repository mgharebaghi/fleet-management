"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";

import { JalaliDatePicker } from "@/components/ui/date-picker/jalali-date-picker";
import { FieldLabel } from "@/components/ui/form-field/form-field";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { TimeSelect } from "@/components/ui/time-select/time-select";
import type { TripRequestDetails } from "../../application/trip-records";
import { changeTripRequestStatusAction } from "../trip.actions";
import { tripMessages } from "../trip-form-data";
import { CancelTripRequestAction } from "./cancel-trip-request-action";
import { PhaseSubmitButton } from "./phase-submit-button";
import styles from "./trip-workspace.module.css";
import type { TripWorkspaceView } from "./trip-workspace-view";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function TripRequestStatusControl({
  details,
  view,
  compact = false,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  compact?: boolean;
}) {
  const router = useSafeRouter();
  const [state, formAction, pending] = useActionState(
    changeTripRequestStatusAction.bind(null, details.tripRequestId),
    {},
  );
  const refreshed = useRef(false);
  useEffect(() => {
    if (!state.success || refreshed.current) return;
    refreshed.current = true;
    router?.refresh();
  }, [router, state.success]);
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
          <form action={formAction} className={styles.phaseForm}>
            <input type="hidden" name="requestStatus" value={statusValue} />
            {statusValue === "InProgress" && (
              <div className={styles.phaseDeparture}>
                <FieldLabel htmlFor={`${prefix}-departure-time`}>
                  زمان واقعی حرکت
                </FieldLabel>
                <div className={styles.phaseDepartureFields}>
                  <JalaliDatePicker
                    name="actualDepartureDay"
                    invalid={state.field === "actualDepartureDay"}
                  />
                  <TimeSelect
                    id={`${prefix}-departure-time`}
                    name="actualDepartureTime"
                  />
                </div>
                <p className={styles.muted}>
                  اگر خالی بماند، زمان برنامه‌ریزی‌شدهٔ حرکت ثبت می‌شود.
                </p>
              </div>
            )}
            <PhaseSubmitButton
              pending={pending}
              enabled={action.enabled}
              label={action.label}
            />
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
