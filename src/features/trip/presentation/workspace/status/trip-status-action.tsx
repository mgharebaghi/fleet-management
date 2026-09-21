import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import type { TripRequestDetails } from "../../../application/trip-records";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import styles from "../trip-workspace.module.css";
import { TripRequestStatusControl } from "../trip-request-status-control";
import type { TripWorkspaceView } from "../trip-workspace-view";

export function StatusActionSection({
  details,
  view,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
}) {
  const completedExecutions = view.passengers.filter((item) =>
    item.executionStatus === "Completed",
  ).length;
  const allExecutionsCompleted =
    completedExecutions === view.passengerCount && view.passengerCount > 0;

  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>
            {details.status === "InProgress"
              ? "اقدام تکمیل سفر"
              : details.status === "Assigned"
                ? "اقدام شروع سفر"
                : "اقدام درخواست"}
          </h3>
          {details.status === "InProgress" && (
            <p>پس از تکمیل اجرای همه مسافران، سفر را نهایی و تکمیل کنید.</p>
          )}
          {details.status === "Assigned" && (
            <p>تخصیص‌ها کامل است؛ برای شروع عملیات سفر، «شروع سفر» را ثبت کنید.</p>
          )}
          {details.status === "New" && (
            <p>پس از تکمیل تخصیص خودرو و راننده، وضعیت درخواست را ثبت کنید.</p>
          )}
        </div>
        <div className={styles.completionSummary}>
          <StatusBadge
            label={view.statusLabel}
            tone={tripRequestStatusTone(view.status)}
          />
          {details.status === "InProgress" && (
            <StatusBadge
              label={
                allExecutionsCompleted
                  ? "همه اجراها انجام شده"
                  : `${completedExecutions} از ${view.passengerCount} مسافر تکمیل شده`
              }
              tone={allExecutionsCompleted ? "positive" : "warning"}
            />
          )}
        </div>
      </div>
      <TripRequestStatusControl details={details} view={view} compact />
    </section>
  );
}
