import { ActionLink } from "@/components/ui/action-link/action-link";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import type {
  TripAssignmentReference,
  TripExecutionRecord,
  TripRequestDetails,
} from "../../../application/trip-records";
import { TripAssignmentPlanner } from "./trip-assignment-form";
import { formatTripDateTime } from "../../trip-format";
import { tripRequestStatusTone } from "../../trip-list-status-tone";
import { executionStatusLabel } from "../../trip-status";
import styles from "../trip-workspace.module.css";
import { distinctAssignmentExecutions } from "../trip-workspace-view";

function AssignmentRecord({
  tripRequestId,
  execution,
}: {
  tripRequestId: number;
  execution: TripExecutionRecord;
}) {
  const assignment = execution.assignment;

  return (
    <article className={styles.assignmentCard}>
      <div className={styles.assignmentCardHeader}>
        <StatusBadge
          label={executionStatusLabel(execution.status)}
          tone={tripRequestStatusTone(execution.status)}
        />
        {execution.status !== "Cancelled" && (
          <ActionLink
            href={`/trips/${tripRequestId}/voucher/${execution.tripId}`}
            variant="secondary"
          >
            صدور برگه مأموریت
          </ActionLink>
        )}
      </div>

      <div className={styles.assignmentSections}>
        <section className={styles.assignmentSubSection}>
          <dl className={styles.assignmentFacts}>
            <div>
              <dt>راننده</dt>
              <dd>
                {assignment.driverFirstName} {assignment.driverLastName}
              </dd>
            </div>
            <div>
              <dt>شماره پرسنلی</dt>
              <dd>
                <TechnicalValue>
                  {assignment.driverPersonnelNo ?? "—"}
                </TechnicalValue>
              </dd>
            </div>
            <div>
              <dt>وضعیت گواهینامه</dt>
              <dd>
                <StatusBadge
                  label={
                    assignment.hasEligibleLicense
                      ? "گواهینامه واجد شرایط"
                      : "فاقد گواهینامه واجد شرایط"
                  }
                  tone={assignment.hasEligibleLicense ? "positive" : "negative"}
                />
              </dd>
            </div>
          </dl>
        </section>

        <section className={styles.assignmentSubSection}>
          <dl className={styles.assignmentFacts}>
            <div>
              <dt>خودرو</dt>
              <dd>
                {assignment.vehicle.brandName} {assignment.vehicle.modelName}
              </dd>
            </div>
            <div>
              <dt>پلاک</dt>
              <dd>
                <VehiclePlate vehicle={assignment.vehicle} />
              </dd>
            </div>
            <div>
              <dt>کد خودرو</dt>
              <dd>
                <TechnicalValue>{assignment.vehicle.vehicleCode}</TechnicalValue>
              </dd>
            </div>
            <div>
              <dt>وضعیت عملیاتی خودرو</dt>
              <dd>{assignment.vehicle.vehicleStatusName}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.assignmentSubSection}>
          <dl className={styles.assignmentFacts}>
            <div className={styles.wide}>
              <dt>بازه زمانی</dt>
              <dd className={styles.timeRangeValue}>
                <span>{formatTripDateTime(assignment.fromDateTime)}</span>
                <span className={styles.timeRangeArrow} aria-hidden="true">
                  ←
                </span>
                <span>{formatTripDateTime(assignment.toDateTime)}</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </article>
  );
}

export function DriverVehicleTab({
  details,
  assignments,
  isPlanningFrozen,
}: {
  details: TripRequestDetails;
  assignments: TripAssignmentReference[];
  isPlanningFrozen: boolean;
}) {
  const hasAnyAssignment = details.passengers.some(
    (trip) => trip.executions.length > 0,
  );
  const distinctExecutions = distinctAssignmentExecutions(details.passengers);
  const unassignedPassengers = details.passengers.filter(
    (trip) => trip.executions.length === 0,
  );

  return (
    <section
      id="workspace-tab-assignment"
      className={styles.tabPanel}
      aria-label="راننده و خودرو"
      tabIndex={-1}
    >
      {!hasAnyAssignment && (
        <div className={styles.emptyStateBlock}>
          <InlineNotice tone="info" role="status">
            هنوز تخصیص ثبت نشده است.
          </InlineNotice>
        </div>
      )}

      {hasAnyAssignment && (
        <div className={styles.assignmentPassengerList}>
          {distinctExecutions.length > 0 && (
            <div className={styles.assignmentRecordList}>
              {distinctExecutions.map(({ execution }) => (
                <AssignmentRecord
                  key={execution.assignment.assignmentId}
                  tripRequestId={details.tripRequestId}
                  execution={execution}
                />
              ))}
            </div>
          )}

          {unassignedPassengers.map((trip) => (
            <section className={styles.assignmentPassenger} key={trip.tripId}>
              {!isPlanningFrozen ? (
                <TripAssignmentPlanner
                  tripRequestId={details.tripRequestId}
                  trip={trip}
                  assignments={assignments}
                  scheduledDateTime={details.requestedTravelDateTime}
                  execution={null}
                  requestIsTerminal={isPlanningFrozen}
                />
              ) : (
                <div className={styles.emptyPassengerAssignment}>
                  <p className={styles.muted}>هنوز تخصیص ثبت نشده است.</p>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
