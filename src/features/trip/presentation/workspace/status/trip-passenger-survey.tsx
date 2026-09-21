import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { TripRequestDetails } from "../../../application/trip-records";
import { formatTripDateTime } from "../../trip-format";
import { TripSurveyButton } from "../../survey/trip-survey-dialog";
import styles from "../trip-workspace.module.css";

export function PassengerSurveySection({
  details,
}: {
  details: TripRequestDetails;
}) {
  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionHeading}>نظرسنجی مسافران</h3>
          <p className={styles.muted}>
            نظرسنجی اختیاری است و برای تکمیل درخواست الزامی نیست.
          </p>
        </div>
      </div>

      {(() => {
        const completedItems = details.passengers.flatMap((trip) => {
          const completedExecutions = trip.executions.filter(
            (execution) => execution.status === "Completed",
          );
          return completedExecutions.map((execution) => ({
            trip,
            execution,
          }));
        });

        if (completedItems.length === 0) {
          return (
            <p className={styles.muted}>
              هنوز اجرای مسافری تکمیل نشده است. پس از تکمیل اجرای هر مسافر، امکان ثبت نظرسنجی فراهم می‌شود.
            </p>
          );
        }

        return (
          <div className={styles.stack}>
            {completedItems.map(({ trip, execution }) => {
              const isRecorded = execution.passengerRating !== null;
              return (
                <article
                  className={styles.surveyPassengerCard}
                  key={execution.tripExecutionId}
                >
                  <div className={styles.summaryHeader}>
                    <div>
                      <h3>
                        {trip.passenger.firstName} {trip.passenger.lastName}
                      </h3>
                      {isRecorded ? (
                        <p className={styles.surveyRatingLine}>
                          <span className={styles.surveyRatingScore}>
                            امتیاز: {execution.passengerRating} از ۵
                          </span>
                          {execution.surveyDateTime && (
                            <span className={styles.muted}>
                              {" · "}
                              ثبت‌شده در{" "}
                              {formatTripDateTime(execution.surveyDateTime)}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className={styles.muted}>
                          نظرسنجی هنوز ثبت نشده است.
                        </p>
                      )}
                      {execution.passengerComment && (
                        <p className={styles.surveyComment}>
                          <span className={styles.inlineLabel}>
                            نظر مسافر:
                          </span>{" "}
                          {execution.passengerComment}
                        </p>
                      )}
                    </div>

                    <div className={styles.surveyCardActions}>
                      <StatusBadge
                        label={
                          isRecorded
                            ? "نظرسنجی ثبت شده"
                            : "نظرسنجی ثبت نشده"
                        }
                        tone={isRecorded ? "positive" : "info"}
                      />
                      <TripSurveyButton
                        tripRequestId={details.tripRequestId}
                        passenger={trip.passenger}
                        execution={execution}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        );
      })()}
    </section>
  );
}
