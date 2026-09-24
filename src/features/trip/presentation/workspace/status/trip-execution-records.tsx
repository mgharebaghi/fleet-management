"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type {
  TripExecutionRecord,
  TripPassengerRecord,
  TripRequestDetails,
} from "../../../application/trip-records";
import { TripCompletionButton } from "../../execution/trip-completion-dialog";
import { persistedPlanningExecution } from "../../trip-execution-current";
import { formatTripDateTime } from "../../trip-format";
import { TripSurveyButton } from "../../survey/trip-survey-dialog";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import { executionStatusLabel } from "../../trip-status";
import styles from "../trip-workspace.module.css";
import { hasExecutionDescription } from "../trip-workspace-passenger-display";

const countFormat = new Intl.NumberFormat("fa-IR");

function activeExecution(passenger: TripPassengerRecord) {
  return persistedPlanningExecution(passenger.executions);
}

export function PassengerExecutionBoard({
  details,
  editable,
  allowSurvey,
}: {
  details: TripRequestDetails;
  editable: boolean;
  allowSurvey: boolean;
}) {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const rows = details.passengers.map((passenger) => ({
    passenger,
    execution: activeExecution(passenger),
  }));
  const completed = rows.filter(
    (row) => row.execution?.status === "Completed",
  ).length;
  const remaining = rows.length - completed;

  return (
    <section id="passenger-dropoff" className={styles.workspaceSection}>
      <div className={styles.executionSummary}>
        <div className={styles.executionSummaryMain}>
          <h3>مسافران و نظرسنجی</h3>
          <p>
            {countFormat.format(rows.length)} مسافر ·{" "}
            {countFormat.format(completed)} تکمیل‌شده ·{" "}
            {countFormat.format(remaining)} باقی‌مانده
          </p>
        </div>
        <p className={styles.muted}>
          نظرسنجی اختیاری است و برای تکمیل درخواست الزامی نیست.
        </p>
      </div>
      <div className={styles.executionList}>
        {rows.map(({ passenger, execution }) => (
          <PassengerExecutionRow
            key={passenger.tripId}
            details={details}
            passenger={passenger}
            execution={execution}
            editable={editable}
            allowSurvey={allowSurvey}
            open={openIds.includes(passenger.tripId)}
            onToggle={() =>
              setOpenIds((current) =>
                current.includes(passenger.tripId)
                  ? current.filter((id) => id !== passenger.tripId)
                  : [...current, passenger.tripId],
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

function PassengerExecutionRow({
  details,
  passenger,
  execution,
  editable,
  allowSurvey,
  open,
  onToggle,
}: {
  details: TripRequestDetails;
  passenger: TripPassengerRecord;
  execution: TripExecutionRecord | null;
  editable: boolean;
  allowSurvey: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const surveyRecorded = execution?.passengerRating !== null && execution !== null;
  const canSurvey = allowSurvey && execution?.status === "Completed";
  const panelId = `execution-row-${passenger.tripId}`;

  return (
    <article className={styles.executionRow}>
      <div className={styles.executionRowMain}>
        <strong>
          {passenger.passenger.firstName} {passenger.passenger.lastName}
        </strong>
        {execution ? (
          <StatusBadge
            label={executionStatusLabel(execution.status)}
            tone={tripRequestStatusTone(execution.status)}
          />
        ) : (
          <span className={styles.muted}>فاقد رکورد اجرا</span>
        )}
        <span>
          حرکت واقعی{" "}
          {formatTripDateTime(execution?.actualPickupDateTime ?? null)}
        </span>
        <span>
          پیاده‌شدن واقعی{" "}
          {formatTripDateTime(execution?.actualDropoffDateTime ?? null)}
        </span>
        {execution && (
          <span>
            {surveyRecorded
              ? `امتیاز: ${execution.passengerRating} از ۵`
              : canSurvey
                ? "نظرسنجی ثبت نشده"
                : "نظرسنجی بعد از پایان اجرا"}
          </span>
        )}
        <div className={styles.executionRowActions}>
          {execution && (
            <button
              type="button"
              className={styles.executionReveal}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={onToggle}
            >
              {open ? "بستن جزئیات" : "جزئیات اجرا"}
            </button>
          )}
          {editable && execution && (
            <TripCompletionButton
              tripRequestId={details.tripRequestId}
              passengers={details.passengers}
              focusTripId={passenger.tripId}
              preferCompleted={execution.status !== "Completed"}
              label={
                execution.status === "Completed" ? "ویرایش اجرا" : "ثبت پیاده‌شدن"
              }
              variant="secondary"
              size="sm"
            />
          )}
          {canSurvey && execution && (
            <TripSurveyButton
              tripRequestId={details.tripRequestId}
              passenger={passenger.passenger}
              execution={execution}
            />
          )}
        </div>
      </div>
      {execution && (
        <div id={panelId} hidden={!open} className={styles.executionRevealPanel}>
          <p>
            کیلومترشمار {execution.startOdometer ?? "—"} /{" "}
            {execution.endOdometer ?? "—"}
          </p>
          {hasExecutionDescription(execution.description) && (
            <p>{execution.description}</p>
          )}
          {execution.passengerComment && <p>{execution.passengerComment}</p>}
          {execution.surveyDateTime && (
            <p>ثبت‌شده در {formatTripDateTime(execution.surveyDateTime)}</p>
          )}
        </div>
      )}
    </article>
  );
}
