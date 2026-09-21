import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { TripRequestDetails } from "../../../application/trip-records";
import { TripCompletionButton } from "../../trip-completion-dialog";
import { persistedPlanningExecution } from "../../trip-execution-current";
import { formatTripDateTime } from "../../trip-format";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import { executionStatusLabel } from "../../trip-status";
import styles from "../trip-workspace.module.css";
import { hasExecutionDescription } from "../trip-workspace-passenger-display";
import type { TripWorkspaceView } from "../trip-workspace-view";

export function InProgressPassengerExecutions({
  details,
  view,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
}) {
  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>اطلاعات اجرای مسافران</h3>
          <p>
            زمان و کیلومتر واقعی سوارشدن و پیاده‌شدن مسافران را از برگهٔ
            مأموریت ثبت یا ویرایش کنید.
          </p>
        </div>
        <div>
          <TripCompletionButton
            tripRequestId={details.tripRequestId}
            passengers={details.passengers}
          />
        </div>
      </div>
      <div className={styles.stack}>
        {details.passengers.map((trip, index) => {
          const item = view.passengers[index];
          if (!item) return null;
          const execution = persistedPlanningExecution(trip.executions);
          return (
            <article
              className={styles.executionPassengerCard}
              key={trip.tripId}
            >
              <div className={styles.executionPassengerHeader}>
                <h3>{item.personName}</h3>
                {item.executionStatus && (
                  <StatusBadge
                    label={executionStatusLabel(item.executionStatus)}
                    tone={tripRequestStatusTone(item.executionStatus)}
                  />
                )}
              </div>
              {execution ? (
                <div className={styles.executionRecord}>
                  <dl className={styles.summaryFacts}>
                    <div>
                      <dt>وضعیت اجرا</dt>
                      <dd>{executionStatusLabel(execution.status)}</dd>
                    </div>
                    <div>
                      <dt>حرکت واقعی</dt>
                      <dd>
                        {execution.actualPickupDateTime
                          ? formatTripDateTime(
                              execution.actualPickupDateTime,
                            )
                          : "ثبت‌نشده (در انتظار گزارش راننده)"}
                      </dd>
                    </div>
                    <div>
                      <dt>بازگشت واقعی</dt>
                      <dd>
                        {execution.actualDropoffDateTime
                          ? formatTripDateTime(
                              execution.actualDropoffDateTime,
                            )
                          : "ثبت‌نشده"}
                      </dd>
                    </div>
                    <div>
                      <dt>کیلومتر شروع / پایان</dt>
                      <dd>
                        {execution.startOdometer ?? "—"} /{" "}
                        {execution.endOdometer ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  {hasExecutionDescription(execution.description) && (
                    <p className={styles.executionDescription}>
                      <span className={styles.inlineLabel}>
                        توضیحات اجرا:
                      </span>{" "}
                      {execution.description}
                    </p>
                  )}
                </div>
              ) : (
                <p className={styles.muted}>فاقد رکورد اجرا</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function TerminalExecutionHistory({
  details,
}: {
  details: TripRequestDetails;
}) {
  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>سابقه اجرای سفر</h3>
          <p>اطلاعات ثبت‌شدهٔ حرکت، بازگشت و کیلومتر</p>
        </div>
      </div>
      <div className={styles.stack}>
        {details.passengers.map((trip) => (
          <article
            className={styles.executionPassengerCard}
            key={trip.tripId}
          >
            <div className={styles.executionPassengerHeader}>
              <h3>
                {trip.passenger.firstName} {trip.passenger.lastName}
              </h3>
            </div>
            {trip.executions.map((execution) => (
              <div
                className={styles.executionRecord}
                key={execution.tripExecutionId}
              >
                <dl className={styles.summaryFacts}>
                  <div>
                    <dt>وضعیت اجرا</dt>
                    <dd>{executionStatusLabel(execution.status)}</dd>
                  </div>
                  <div>
                    <dt>حرکت</dt>
                    <dd>
                      {formatTripDateTime(execution.actualPickupDateTime)}
                    </dd>
                  </div>
                  <div>
                    <dt>بازگشت</dt>
                    <dd>
                      {formatTripDateTime(execution.actualDropoffDateTime)}
                    </dd>
                  </div>
                  <div>
                    <dt>کیلومتر شروع / پایان</dt>
                    <dd>
                      {execution.startOdometer ?? "—"} /{" "}
                      {execution.endOdometer ?? "—"}
                    </dd>
                  </div>
                </dl>
                {hasExecutionDescription(execution.description) && (
                  <p className={styles.executionDescription}>
                    <span className={styles.inlineLabel}>
                      توضیحات اجرا:
                    </span>{" "}
                    {execution.description}
                  </p>
                )}
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
