import { notFound } from "next/navigation";

import { ActionLink } from "@/components/ui/action-link/action-link";
import { BackLink } from "@/components/ui/back-link/back-link";
import { DataTable } from "@/components/ui/data-table/data-table";
import { InlineNotice } from "@/components/ui/inline-notice/inline-notice";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "@/components/ui/record-cards/record-cards";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import { VehiclePlate } from "@/components/ui/vehicle-plate/vehicle-plate";
import type {
  TripAssignmentReference,
  TripExecutionRecord,
  TripLocationReference,
  TripPersonReference,
  TripRequestDetails,
} from "../../application/trip-records";
import { makeReadTrips } from "../../composition/trip.factory";
import { TripAssignmentPlanner } from "../trip-assignment-form";
import { TripRouteDialog } from "../trip-route-dialog";
import {
  AddPassengerButton,
  DeletePassengerButton,
  EditPassengerButton,
} from "../trip-passenger-dialog";
import { TripCompletionButton } from "../trip-completion-dialog";
import { TripSurveyButton } from "../trip-survey-dialog";
import { persistedPlanningExecution } from "../trip-execution-current";
import { formatTripDateTime } from "../trip-format";
import { executionStatusLabel } from "../trip-status";
import { tripRequestStatusTone } from "../trip-list-status-tone";
import { TripWorkspaceFocus } from "./trip-workspace-focus";
import { TripRequestStatusControl } from "./trip-request-status-control";
import { TripWorkspaceTabs } from "./trip-workspace-tabs";
import {
  hasExecutionDescription,
  presentPlanningExecutionStatusLabel,
  presentTripPassengerStatus,
} from "./trip-workspace-passenger-display";
import { CheckIcon } from "@/components/ui/icon/icons";
import styles from "./trip-workspace.module.css";
import { RouteCard } from "./trip-route-card";
import {
  buildTripLifecycleVisualModel,
  distinctAssignmentExecutions,
  groupRoutesForDisplay,
  projectTripWorkspace,
  workspaceSectionForTab,
  type TripWorkspaceView,
  type WorkspaceSectionId,
} from "./trip-workspace-view";

function WorkspaceIdentity({
  view,
  backHref,
}: {
  view: TripWorkspaceView;
  backHref: string;
}) {
  return (
    <header className={styles.identity}>
      <div className={styles.identityTop}>
        <div className={styles.identityTitle}>
          <h1>{view.requestNo}</h1>
          <StatusBadge
            label={view.statusLabel}
            tone={tripRequestStatusTone(view.status)}
          />
        </div>
        <BackLink href={backHref} label="بازگشت به لیست" />
      </div>
      <div className={styles.summaryCards}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>مسیر</span>
          <strong>
            {view.originSummary} ← {view.destinationSummary}
          </strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>زمان سفر</span>
          <strong>{formatTripDateTime(view.plannedAt)}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>نوع درخواست</span>
          <strong>{view.requestTypeName}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>مسافران</span>
          <strong>{view.passengerCount} نفر</strong>
        </article>
      </div>
    </header>
  );
}

type PassengerItem = TripWorkspaceView["passengers"][number];

function PassengerIdentity({ item }: { item: PassengerItem }) {
  return (
    <span className={styles.passengerIdentityBlock}>
      <strong className={styles.passengerName}>{item.personName}</strong>
      {(item.personnelNo || item.mobile) && (
        <span className={styles.passengerIdentity}>
          {item.personnelNo && (
            <span>
              پرسنلی <TechnicalValue>{item.personnelNo}</TechnicalValue>
            </span>
          )}
          {item.mobile && (
            <span>
              موبایل <TechnicalValue>{item.mobile}</TechnicalValue>
            </span>
          )}
        </span>
      )}
      {item.description && (
        <span className={styles.passengerDescription}>{item.description}</span>
      )}
    </span>
  );
}

function PassengerRoute({ item }: { item: PassengerItem }) {
  return (
    <span className={styles.passengerRoute}>
      <span>{item.originName}</span>
      <span aria-hidden="true">←</span>
      <span>{item.destinationName}</span>
    </span>
  );
}

function PassengerStatus({ item }: { item: PassengerItem }) {
  return (
    <StatusBadge
      label={presentTripPassengerStatus(item.passengerStatus)}
      tone={tripRequestStatusTone(item.passengerStatus ?? "")}
    />
  );
}

function PassengerTable({
  passengers,
  details,
  people,
  locations,
  isPlanningFrozen,
}: {
  passengers: PassengerItem[];
  details: TripRequestDetails;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  return (
    <div className={styles.passengerTable}>
      <DataTable caption="فهرست مسافران سفر" minWidth={680}>
        <thead>
          <tr>
            <th scope="col">مسافر</th>
            <th scope="col">مسیر</th>
            <th scope="col">زمان درخواست سوارشدن</th>
            <th scope="col">ترتیب (سوار / پیاده)</th>
            <th scope="col">وضعیت مسافر</th>
            <th scope="col">برنامه‌ریزی / اجرا</th>
            {!isPlanningFrozen && <th scope="col">عملیات</th>}
          </tr>
        </thead>
        <tbody>
          {passengers.map((item) => {
            const trip = details.passengers.find((p) => p.tripId === item.tripId);
            return (
              <tr key={item.tripId}>
                <td>
                  <PassengerIdentity item={item} />
                </td>
                <td>
                  <PassengerRoute item={item} />
                </td>
                <td className={styles.passengerDateTime}>
                  {formatTripDateTime(item.pickupAt)}
                </td>
                <td className={styles.passengerOrder}>
                  {item.pickupOrder ?? "—"} / {item.dropoffOrder ?? "—"}
                </td>
                <td>
                  <PassengerStatus item={item} />
                </td>
                <td className={styles.passengerPlanningStatus}>
                  {presentPlanningExecutionStatusLabel(item)}
                </td>
                {!isPlanningFrozen && trip && (
                  <td>
                    <div className={styles.passengerActions}>
                      <EditPassengerButton
                        tripRequestId={details.tripRequestId}
                        passenger={trip}
                        people={people}
                        locations={locations}
                      />
                      <DeletePassengerButton
                        tripRequestId={details.tripRequestId}
                        trip={trip}
                      />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
}

function PassengerCards({
  passengers,
  details,
  people,
  locations,
  isPlanningFrozen,
}: {
  passengers: PassengerItem[];
  details: TripRequestDetails;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  return (
    <RecordCardList>
      {passengers.map((item) => {
        const trip = details.passengers.find((p) => p.tripId === item.tripId);
        return (
          <RecordCard key={item.tripId}>
            <RecordCardHeader
              title={<PassengerIdentity item={item} />}
              badge={<PassengerStatus item={item} />}
            />
            <RecordCardDetails>
              <RecordCardDetail label="مسیر">
                <PassengerRoute item={item} />
              </RecordCardDetail>
              <RecordCardDetail label="زمان درخواست سوارشدن">
                {formatTripDateTime(item.pickupAt)}
              </RecordCardDetail>
              <RecordCardDetail label="ترتیب سوار / پیاده">
                {item.pickupOrder ?? "—"} / {item.dropoffOrder ?? "—"}
              </RecordCardDetail>
              <RecordCardDetail label="برنامه‌ریزی / اجرا">
                {presentPlanningExecutionStatusLabel(item)}
              </RecordCardDetail>
            </RecordCardDetails>
            {!isPlanningFrozen && trip && (
              <div className={styles.passengerCardActions}>
                <EditPassengerButton
                  tripRequestId={details.tripRequestId}
                  passenger={trip}
                  people={people}
                  locations={locations}
                />
                <DeletePassengerButton
                  tripRequestId={details.tripRequestId}
                  trip={trip}
                />
              </div>
            )}
          </RecordCard>
        );
      })}
    </RecordCardList>
  );
}

function TripLifecycleProgressSection({
  status,
}: {
  status: string;
}) {
  const model = buildTripLifecycleVisualModel(status);

  return (
    <section className={styles.workspaceSection}>
      <div className={styles.sectionHeader}>
        <div>
          <h3>وضعیت پیشرفت سفر</h3>
          <p>مراحل کلی چرخه عمر سفر و وضعیت جاری درخواست</p>
        </div>
      </div>

      {model.isCancelled ? (
        <div className={styles.lifecycleCancelled}>
          <StatusBadge label={model.statusLabel} tone="negative" />
          <p className={styles.lifecycleCancelledNote}>
            {model.description}
          </p>
        </div>
      ) : (
        <ol
          className={styles.lifecycleTimeline}
          aria-label="مراحل چرخه عمر سفر"
        >
          {(() => {
            const currentStageIndex = model.stages.findIndex((s) => s.isCurrent);

            return model.stages.map((stage, index) => {
              const isTerminalCompleted =
                stage.id === "completion" && stage.isComplete;
              const state = stage.isCurrent
                ? "current"
                : stage.isComplete
                  ? "complete"
                  : "upcoming";
              const isConnectorBeforeComplete =
                index <= currentStageIndex && currentStageIndex > 0;
              const isConnectorAfterComplete =
                index + 1 <= currentStageIndex;

              return (
                <li
                  key={stage.id}
                  className={styles.lifecycleItem}
                  data-stage={stage.id}
                  data-state={state}
                  data-terminal={isTerminalCompleted ? "true" : undefined}
                  aria-current={stage.isCurrent ? "step" : undefined}
                >
                  <div
                    className={styles.lifecycleMarkerTrack}
                    data-next-complete={isConnectorAfterComplete ? "true" : undefined}
                  >
                    {index > 0 && (
                      <span
                        className={`${styles.lifecycleRail} ${styles.lifecycleRailStart}`}
                        data-state={
                          isConnectorBeforeComplete ? "complete" : "upcoming"
                        }
                        aria-hidden="true"
                      />
                    )}
                    {index < model.stages.length - 1 && (
                      <span
                        className={`${styles.lifecycleRail} ${styles.lifecycleRailEnd}`}
                        data-state={
                          isConnectorAfterComplete ? "complete" : "upcoming"
                        }
                        aria-hidden="true"
                      />
                    )}
                    <span className={styles.lifecycleMarker} aria-hidden="true">
                      {stage.isComplete ? (
                        <CheckIcon size={isTerminalCompleted ? 14 : 12} />
                      ) : stage.isCurrent ? (
                        <span className={styles.lifecycleCurrentDot} />
                      ) : null}
                    </span>
                  </div>
                  <div className={styles.lifecycleContent}>
                    <span className={styles.lifecycleLabel}>{stage.label}</span>
                    {stage.isCurrent && (
                      <span
                        className={styles.lifecycleCurrentBadge}
                        data-tone={isTerminalCompleted ? "positive" : "info"}
                      >
                        {isTerminalCompleted ? "تکمیل‌شده" : "مرحله فعلی"}
                      </span>
                    )}
                  </div>
                </li>
              );
            });
          })()}
        </ol>
      )}
    </section>
  );
}

function DetailsTab({
  details,
  view,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
}) {
  return (
    <section
      id="workspace-tab-details"
      className={styles.tabPanel}
      aria-label="جزئیات سفر"
      tabIndex={-1}
    >
      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>اطلاعات درخواست</h3>
            <p>مشخصات اصلی و وضعیت مستقل درخواست سفر</p>
          </div>
        </div>
        <dl className={styles.summaryFacts}>
          <div>
            <dt>شمارهٔ درخواست</dt>
            <dd>
              <TechnicalValue>{details.requestNo}</TechnicalValue>
            </dd>
          </div>
          <div>
            <dt>نوع درخواست</dt>
            <dd>{details.requestType.typeName}</dd>
          </div>
          <div>
            <dt>وضعیت درخواست</dt>
            <dd>
              <StatusBadge
                label={view.statusLabel}
                tone={tripRequestStatusTone(view.status)}
              />
            </dd>
          </div>
          {details.purpose && (
            <div className={styles.wide}>
              <dt>هدف سفر</dt>
              <dd>{details.purpose}</dd>
            </div>
          )}
          {details.description && (
            <div className={styles.wide}>
              <dt>توضیحات درخواست</dt>
              <dd>{details.description}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h3>زمان‌بندی</h3>
            <p>زمان ثبت درخواست و زمان پیشنهادی انجام سفر</p>
          </div>
        </div>
        <dl className={styles.summaryFacts}>
          <div>
            <dt>زمان ثبت درخواست</dt>
            <dd>{formatTripDateTime(details.requestDateTime)}</dd>
          </div>
          <div>
            <dt>زمان پیشنهادی سفر</dt>
            <dd>{formatTripDateTime(details.requestedTravelDateTime)}</dd>
          </div>
        </dl>
      </section>

      <TripLifecycleProgressSection status={details.status} />
    </section>
  );
}

function PassengersTab({
  details,
  view,
  people,
  locations,
  isPlanningFrozen,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  isPlanningFrozen: boolean;
}) {
  return (
    <section
      id="workspace-tab-passengers"
      className={styles.tabPanel}
      aria-label="مسافران"
      tabIndex={-1}
    >
      {!isPlanningFrozen && (
        <div className={styles.passengerHeaderActions}>
          <div />
          <AddPassengerButton
            tripRequestId={details.tripRequestId}
            people={people}
            locations={locations}
            commonOriginId={details.passengers[0]?.originLocationId}
            commonDestinationId={details.passengers[0]?.destinationLocationId}
          />
        </div>
      )}
      <PassengerTable
        passengers={view.passengers}
        details={details}
        people={people}
        locations={locations}
        isPlanningFrozen={isPlanningFrozen}
      />
      <PassengerCards
        passengers={view.passengers}
        details={details}
        people={people}
        locations={locations}
        isPlanningFrozen={isPlanningFrozen}
      />
    </section>
  );
}

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

function DriverVehicleTab({
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

function RouteTab({
  details,
  locations,
  isPlanningFrozen,
}: {
  details: TripRequestDetails;
  locations: Awaited<
    ReturnType<ReturnType<typeof makeReadTrips>["availableLocations"]>
  >;
  isPlanningFrozen: boolean;
}) {
  const routeGroups = groupRoutesForDisplay(details.passengers);
  const hasExistingRoutes = routeGroups.length > 0;

  return (
    <section
      id="workspace-tab-route"
      className={styles.tabPanel}
      aria-label="مسیر"
      tabIndex={-1}
    >
      {!isPlanningFrozen && (
        <div className={styles.routeActionRow}>
          <TripRouteDialog
            key={routeGroups.length}
            tripRequestId={details.tripRequestId}
            passengers={details.passengers}
            locations={locations}
            triggerLabel={
              hasExistingRoutes
                ? "افزودن مسیر جایگزین"
                : "ثبت مسیر برنامه‌ریزی‌شده"
            }
          />
        </div>
      )}

      {routeGroups.length === 0 ? (
        <InlineNotice tone="info" role="status">
          هنوز مسیر اختیاری برای این سفر ثبت نشده است.
        </InlineNotice>
      ) : (
        <div className={styles.recordList}>
          {routeGroups.map(({ route, label }) => (
            <RouteCard
              key={route.routeId}
              route={route}
              label={label}
              tripRequestId={details.tripRequestId}
              passengers={details.passengers}
              locations={locations}
              isPlanningFrozen={isPlanningFrozen}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function StatusCompletionTab({
  details,
  view,
  requestIsTerminal,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  requestIsTerminal: boolean;
}) {
  const completedExecutions = view.passengers.filter((item) =>
    item.executionStatus === "Completed",
  ).length;
  const allExecutionsCompleted =
    completedExecutions === view.passengerCount && view.passengerCount > 0;

  const assignments = details.passengers
    .flatMap((trip) => {
      const planned = persistedPlanningExecution(trip.executions)?.assignment;
      const all = trip.executions.map((e) => e.assignment);
      return planned ? [planned, ...all] : all;
    })
    .filter((a): a is TripAssignmentReference => Boolean(a));
  const uniqueAssignments = Array.from(
    new Map(assignments.map((a) => [a.assignmentId, a])).values(),
  );

  return (
    <section
      id="workspace-tab-completion"
      className={styles.tabPanel}
      aria-label="وضعیت و اقدام سفر"
      tabIndex={-1}
    >
      {!requestIsTerminal && (
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
      )}

      {details.status === "Cancelled" && (
        <div className={styles.emptyStateBlock}>
          <InlineNotice tone="danger" role="status">
            این درخواست سفر لغو شده است و پرونده در وضعیت پایانی قرار دارد.
          </InlineNotice>
        </div>
      )}

      {details.status === "Completed" && (
        <>
          <div className={styles.emptyStateBlock}>
            <InlineNotice tone="info" role="status">
              پروندهٔ این سفر با موفقیت تکمیل شده است.
            </InlineNotice>
          </div>

          <section className={styles.workspaceSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h3>مشخصات راننده و خودرو</h3>
                <p>اطلاعات راننده و خودروی مجری سفر</p>
              </div>
            </div>
            {uniqueAssignments.length === 0 ? (
              <p className={styles.muted}>اطلاعات راننده و خودرو ثبت‌نشده است.</p>
            ) : (
              <div className={styles.stack}>
                {uniqueAssignments.map((assignment) => (
                  <article
                    key={assignment.assignmentId}
                    className={styles.operationalSectionCard}
                  >
                    <div className={styles.operationalCardHeader}>
                      <h4>راننده و خودرو</h4>
                      <StatusBadge label="تکمیل‌شده" tone="positive" />
                    </div>
                    <div className={styles.operationalAssignmentItem}>
                      <dl className={styles.compactFacts}>
                        <div>
                          <dt>راننده</dt>
                          <dd>
                            {assignment.driverFirstName}{" "}
                            {assignment.driverLastName}
                          </dd>
                        </div>
                        <div>
                          <dt>شماره پرسنلی راننده</dt>
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
                              tone={
                                assignment.hasEligibleLicense
                                  ? "positive"
                                  : "negative"
                              }
                            />
                          </dd>
                        </div>
                        <div>
                          <dt>خودرو</dt>
                          <dd>
                            {assignment.vehicle.brandName}{" "}
                            {assignment.vehicle.modelName}
                          </dd>
                        </div>
                        <div>
                          <dt>پلاک خودرو</dt>
                          <dd>
                            <VehiclePlate vehicle={assignment.vehicle} />
                          </dd>
                        </div>
                        <div>
                          <dt>کد خودرو</dt>
                          <dd>
                            <TechnicalValue>
                              {assignment.vehicle.vehicleCode}
                            </TechnicalValue>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {details.status === "Assigned" && (
        <section className={styles.workspaceSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>خلاصهٔ عملیاتی سفر آمادهٔ شروع</h3>
              <p>مشخصات راننده، خودرو و زمان‌بندی حرکت پیش از شروع عملیات</p>
            </div>
          </div>

          <div className={styles.operationalSummaryGrid}>
            {/* بخش ۱: مسافر / مسافران */}
            <section className={styles.operationalSectionCard}>
              <div className={styles.operationalCardHeader}>
                <h4>
                  {details.passengers.length > 1 ? "مسافران" : "مسافر"}
                </h4>
                <StatusBadge label="آمادهٔ شروع" tone="warning" />
              </div>
              <div className={styles.operationalPassengerList}>
                {details.passengers.map((trip) => (
                  <div
                    key={trip.tripId}
                    className={styles.operationalPassengerItem}
                  >
                    <div className={styles.operationalPassengerMain}>
                      <strong>
                        {trip.passenger.firstName} {trip.passenger.lastName}
                      </strong>
                      {trip.passenger.personnelNo && (
                        <span className={styles.muted}>
                          پرسنلی:{" "}
                          <TechnicalValue>
                            {trip.passenger.personnelNo}
                          </TechnicalValue>
                        </span>
                      )}
                    </div>
                    <dl className={styles.compactFacts}>
                      <div>
                        <dt>زمان حرکت درخواستی</dt>
                        <dd>
                          {formatTripDateTime(
                            trip.requestedPickupDateTime ??
                              details.requestedTravelDateTime,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>مسیر</dt>
                        <dd>
                          {trip.origin.locationName} ←{" "}
                          {trip.destination.locationName}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            {/* بخش ۲: راننده و خودرو */}
            <section className={styles.operationalSectionCard}>
              <div className={styles.operationalCardHeader}>
                <h4>راننده و خودرو</h4>
                <StatusBadge label="تخصیص ثبت‌شده" tone="positive" />
              </div>
              {uniqueAssignments.length === 0 ? (
                <p className={styles.muted}>تخصیص ثبت‌نشده است.</p>
              ) : (
                uniqueAssignments.map((assignment) => (
                  <div
                    key={assignment.assignmentId}
                    className={styles.operationalAssignmentItem}
                  >
                    <dl className={styles.compactFacts}>
                      <div>
                        <dt>راننده</dt>
                        <dd>
                          {assignment.driverFirstName}{" "}
                          {assignment.driverLastName}
                        </dd>
                      </div>
                      <div>
                        <dt>شماره پرسنلی راننده</dt>
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
                            tone={
                              assignment.hasEligibleLicense
                                ? "positive"
                                : "negative"
                            }
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>خودرو</dt>
                        <dd>
                          {assignment.vehicle.brandName}{" "}
                          {assignment.vehicle.modelName}
                        </dd>
                      </div>
                      <div>
                        <dt>پلاک خودرو</dt>
                        <dd>
                          <VehiclePlate vehicle={assignment.vehicle} />
                        </dd>
                      </div>
                      <div>
                        <dt>کد خودرو</dt>
                        <dd>
                          <TechnicalValue>
                            {assignment.vehicle.vehicleCode}
                          </TechnicalValue>
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))
              )}
            </section>
          </div>
        </section>
      )}

      {details.status === "InProgress" && (
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
      )}

      {requestIsTerminal &&
        details.passengers.some((t) => t.executions.length > 0) && (
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
        )}

      {details.status !== "Cancelled" && (
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
      )}
    </section>
  );
}

function ActiveTabPanel({
  section,
  details,
  view,
  people,
  locations,
  assignments,
  isPlanningFrozen,
  requestIsTerminal,
}: {
  section: WorkspaceSectionId;
  details: TripRequestDetails;
  view: TripWorkspaceView;
  people: TripPersonReference[];
  locations: TripLocationReference[];
  assignments: TripAssignmentReference[];
  isPlanningFrozen: boolean;
  requestIsTerminal: boolean;
}) {
  switch (section) {
    case "passengers":
      return (
        <PassengersTab
          details={details}
          view={view}
          people={people}
          locations={locations}
          isPlanningFrozen={isPlanningFrozen}
        />
      );
    case "assignment":
      return (
        <DriverVehicleTab
          details={details}
          assignments={assignments}
          isPlanningFrozen={isPlanningFrozen}
        />
      );
    case "route":
      return (
        <RouteTab
          details={details}
          locations={locations}
          isPlanningFrozen={isPlanningFrozen}
        />
      );
    case "completion":
      return (
        <StatusCompletionTab
          details={details}
          view={view}
          requestIsTerminal={requestIsTerminal}
        />
      );
    default:
      return <DetailsTab details={details} view={view} />;
  }
}

export async function TripWorkspacePage({
  tripRequestId,
  requestedTab,
}: {
  tripRequestId: number;
  requestedTab?: string;
}) {
  const reader = makeReadTrips();
  const details = await reader.details(tripRequestId);
  if (!details) notFound();
  const view = projectTripWorkspace(details);
  const section = workspaceSectionForTab(requestedTab);
  const requestIsTerminal =
    details.status === "Completed" || details.status === "Cancelled";
  const isPlanningFrozen =
    requestIsTerminal || details.status === "InProgress";
  const people =
    section === "passengers" && !isPlanningFrozen
      ? await reader.availablePeople()
      : [];
  const locations =
    section === "route" || (section === "passengers" && !isPlanningFrozen)
      ? await reader.availableLocations()
      : [];
  const assignments =
    section === "assignment" && !isPlanningFrozen
      ? await reader.assignmentsActiveAt(details.requestedTravelDateTime)
      : [];

  return (
    <PageShell>
      <TripWorkspaceFocus sectionId={section} />
      <div className={styles.workspace}>
        <WorkspaceIdentity view={view} backHref="/trips/requests" />
        <TripWorkspaceTabs
          tripRequestId={details.tripRequestId}
          activeSection={section}
          tripRequestStatus={details.status}
        >
          <ActiveTabPanel
            section={section}
            details={details}
            view={view}
            people={people}
            locations={locations}
            assignments={assignments}
            isPlanningFrozen={isPlanningFrozen}
            requestIsTerminal={requestIsTerminal}
          />
        </TripWorkspaceTabs>
      </div>
    </PageShell>
  );
}
