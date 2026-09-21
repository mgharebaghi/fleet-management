import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import type {
  TripAssignmentReference,
  TripRequestDetails,
} from "../../../application/trip-records";
import { persistedPlanningExecution } from "../../trip-execution-current";
import styles from "../trip-workspace.module.css";
import type { TripWorkspaceView } from "../trip-workspace-view";
import { AssignedOperationalSummary } from "./trip-assigned-summary";
import { CompletedSummary } from "./trip-completed-summary";
import {
  InProgressPassengerExecutions,
  TerminalExecutionHistory,
} from "./trip-execution-records";
import { PassengerSurveySection } from "./trip-passenger-survey";
import { StatusActionSection } from "./trip-status-action";

function uniqueAssignmentsFor(
  details: TripRequestDetails,
): TripAssignmentReference[] {
  const assignments = details.passengers
    .flatMap((trip) => {
      const planned = persistedPlanningExecution(trip.executions)?.assignment;
      const all = trip.executions.map((e) => e.assignment);
      return planned ? [planned, ...all] : all;
    })
    .filter((a): a is TripAssignmentReference => Boolean(a));
  return Array.from(
    new Map(assignments.map((a) => [a.assignmentId, a])).values(),
  );
}

export function StatusCompletionTab({
  details,
  view,
  requestIsTerminal,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  requestIsTerminal: boolean;
}) {
  const uniqueAssignments = uniqueAssignmentsFor(details);

  return (
    <section
      id="workspace-tab-completion"
      className={styles.tabPanel}
      aria-label="وضعیت و اقدام سفر"
      tabIndex={-1}
    >
      {!requestIsTerminal && (
        <StatusActionSection details={details} view={view} />
      )}

      {details.status === "Cancelled" && (
        <div className={styles.emptyStateBlock}>
          <InlineNotice tone="danger" role="status">
            این درخواست سفر لغو شده است و پرونده در وضعیت پایانی قرار دارد.
          </InlineNotice>
        </div>
      )}

      {details.status === "Completed" && (
        <CompletedSummary uniqueAssignments={uniqueAssignments} />
      )}

      {details.status === "Assigned" && (
        <AssignedOperationalSummary
          details={details}
          uniqueAssignments={uniqueAssignments}
        />
      )}

      {details.status === "InProgress" && (
        <InProgressPassengerExecutions details={details} view={view} />
      )}

      {requestIsTerminal &&
        details.passengers.some((t) => t.executions.length > 0) && (
          <TerminalExecutionHistory details={details} />
        )}

      {details.status !== "Cancelled" && (
        <PassengerSurveySection details={details} />
      )}
    </section>
  );
}
