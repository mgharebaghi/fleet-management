import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link/back-link";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type {
  TripAssignmentReference,
  TripRequestDetails,
  TripRoute,
} from "../../application/trip-records";
import { makeReadTrips } from "../../composition/trip.factory";
import { TripAssignmentPlanner } from "../trip-assignment-form";
import { TripExecutionForm } from "../trip-execution-form";
import { TripRouteForm } from "../trip-route-form";
import { PassengerSurveyForm } from "../trip-survey-form";
import {
  currentNonTerminalExecution,
  persistedPlanningExecution,
} from "../trip-execution-current";
import { formatTripDateTime } from "../trip-format";
import { executionStatusLabel } from "../trip-status";
import { TripWorkspaceFocus } from "./trip-workspace-focus";
import { TripWorkspacePassengerPanel } from "./trip-workspace-passenger-panel";
import { TripRequestStatusControl } from "./trip-request-status-control";
import { TripWorkspaceTabs } from "./trip-workspace-tabs";
import {
  completionSurveyProgressLine,
  hasExecutionDescription,
  presentPlanningExecutionStatusLabel,
  presentTripPassengerStatus,
} from "./trip-workspace-passenger-display";
import styles from "./trip-workspace.module.css";
import {
  defaultPassengerTabIndex,
  projectTripWorkspace,
  shouldShowStatusControl,
  workspaceSectionForTab,
  type TripWorkspaceView,
  type WorkspaceSectionId,
} from "./trip-workspace-view";

function RouteCard({ route, label }: { route: TripRoute; label: string }) {
  return (
    <article className={styles.groupCard}>
      <div className={styles.summaryHeader}>
        <h3>{route.routeName}</h3>
        <StatusBadge
          label={route.isSelected ? "مسیر انتخاب‌شده" : "مسیر جایگزین"}
          tone={route.isSelected ? "positive" : "info"}
        />
      </div>
      <p className={styles.muted}>{label}</p>
      <p className={styles.muted}>
        شماره جایگزین: {route.alternativeNo ?? "—"} — مسافت:{" "}
        {route.distanceKm ?? "—"} کیلومتر — مدت:{" "}
        {route.estimatedDurationMinute ?? "—"} دقیقه
      </p>
      {route.points.length === 0 ? (
        <p className={styles.muted}>نقطه‌ای برای این مسیر ثبت نشده است.</p>
      ) : (
        <ol>
          {route.points.map((point) => (
            <li key={point.routePointId}>
              <strong>{point.location.locationName}</strong>
              {point.trafficZone && ` — محدوده ${point.trafficZone}`}
              {point.distanceFromStartKm &&
                ` — ${point.distanceFromStartKm} کیلومتر از شروع`}
              {point.description && <p>{point.description}</p>}
            </li>
          ))}
        </ol>
      )}
      {route.description && <p>{route.description}</p>}
    </article>
  );
}

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
        <BackLink href={backHref} label="بازگشت به لیست" />
        <div className={styles.identityTitle}>
          <h1>{view.requestNo}</h1>
          <StatusBadge label={view.statusLabel} tone="info" />
        </div>
      </div>
      <div className={styles.summaryCards}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>مسیر</span>
          <strong>
            {view.originSummary} → {view.destinationSummary}
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
      {view.purpose && (
        <p className={styles.purposeLine}>
          <span className={styles.muted}>هدف سفر:</span> {view.purpose}
        </p>
      )}
    </header>
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
      aria-labelledby="details-heading"
    >
      <h2 id="details-heading" tabIndex={-1}>
        اطلاعات درخواست
      </h2>
      <dl className={styles.summaryFacts}>
        <div>
          <dt>شمارهٔ درخواست</dt>
          <dd>
            <TechnicalValue>{details.requestNo}</TechnicalValue>
          </dd>
        </div>
        <div>
          <dt>وضعیت</dt>
          <dd>{view.statusLabel}</dd>
        </div>
        <div>
          <dt>نوع درخواست</dt>
          <dd>{details.requestType.typeName}</dd>
        </div>
        <div>
          <dt>زمان ثبت درخواست</dt>
          <dd>{formatTripDateTime(details.requestDateTime)}</dd>
        </div>
        <div>
          <dt>زمان برنامه‌ریزی‌شده</dt>
          <dd>{formatTripDateTime(details.requestedTravelDateTime)}</dd>
        </div>
        <div>
          <dt>هدف سفر</dt>
          <dd>{details.purpose ?? "ثبت نشده"}</dd>
        </div>
        <div className={styles.wide}>
          <dt>توضیحات درخواست</dt>
          <dd>{details.description ?? "ثبت نشده"}</dd>
        </div>
      </dl>

      <h3 className={styles.subheading}>
        مسافران ({view.passengerCount} نفر)
      </h3>
      <div className={styles.tableWrap}>
        <table className={styles.passengerTable}>
          <caption className={styles.srOnly}>فهرست مسافران سفر</caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">نام مسافر</th>
              <th scope="col">مبدأ</th>
              <th scope="col">مقصد</th>
              <th scope="col">زمان سوارشدن</th>
              <th scope="col">ترتیب سوار</th>
              <th scope="col">ترتیب پیاده</th>
              <th scope="col">وضعیت مسافر</th>
              <th scope="col">وضعیت برنامه‌ریزی / اجرا</th>
              <th scope="col">توضیحات</th>
            </tr>
          </thead>
          <tbody>
            {view.passengers.map((item, index) => (
              <tr key={item.tripId}>
                <td>{index + 1}</td>
                <td>
                  <span className={styles.passengerName}>{item.personName}</span>
                  {(item.personnelNo || item.mobile) && (
                    <span className={styles.passengerIdentity}>
                      {item.personnelNo && (
                        <>
                          <span className={styles.passengerIdentityLabel}>
                            پرسنلی
                          </span>{" "}
                          <TechnicalValue>{item.personnelNo}</TechnicalValue>
                        </>
                      )}
                      {item.personnelNo && item.mobile && (
                        <span className={styles.passengerIdentitySep}> · </span>
                      )}
                      {item.mobile && (
                        <>
                          <span className={styles.passengerIdentityLabel}>
                            موبایل
                          </span>{" "}
                          <TechnicalValue>{item.mobile}</TechnicalValue>
                        </>
                      )}
                    </span>
                  )}
                </td>
                <td>{item.originName}</td>
                <td>{item.destinationName}</td>
                <td>{formatTripDateTime(item.pickupAt)}</td>
                <td>{item.pickupOrder ?? "—"}</td>
                <td>{item.dropoffOrder ?? "—"}</td>
                <td>{presentTripPassengerStatus(item.passengerStatus)}</td>
                <td>
                  <StatusBadge
                    label={presentPlanningExecutionStatusLabel(item)}
                    tone={
                      item.executionStatus
                        ? "info"
                        : item.hasPlan
                          ? "positive"
                          : "warning"
                    }
                  />
                </td>
                <td>{item.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PlanningTab({
  details,
  view,
  assignments,
  locations,
  requestIsTerminal,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  assignments: Map<number, TripAssignmentReference[]>;
  locations: Awaited<ReturnType<ReturnType<typeof makeReadTrips>["availableLocations"]>>;
  requestIsTerminal: boolean;
}) {
  const switcherItems = view.passengers.map((item, index) => ({
    tripId: item.tripId,
    label: `مسافر ${index + 1}`,
    badge: item.hasPlan ? "ثبت شده" : "نیازمند",
  }));

  return (
    <section
      id="workspace-tab-planning"
      className={styles.tabPanel}
      aria-labelledby="planning-heading"
    >
      <h2 id="planning-heading" tabIndex={-1}>
        برنامه‌ریزی سفر
      </h2>
      <div className={styles.readiness}>
        <StatusBadge
          label={
            view.routeReadiness === "recorded"
              ? "مسیر: ثبت شده"
              : "مسیر: ثبت نشده — اختیاری"
          }
          tone={view.routeReadiness === "recorded" ? "positive" : "info"}
        />
        <StatusBadge
          label={
            view.assignmentReadiness === "recorded"
              ? "خودرو و راننده: ثبت شده"
              : "خودرو و راننده: نیازمند اقدام"
          }
          tone={
            view.assignmentReadiness === "recorded" ? "positive" : "warning"
          }
        />
        <StatusBadge
          label={
            view.voucherReadiness === "ready"
              ? "برگه مأموریت: آماده صدور"
              : "برگه مأموریت: پس از تخصیص قابل صدور"
          }
          tone={view.voucherReadiness === "ready" ? "positive" : "info"}
        />
      </div>

      {shouldShowStatusControl(view.nextAction, "planning") && (
        <TripRequestStatusControl details={details} view={view} />
      )}

      <TripWorkspacePassengerPanel
        items={switcherItems}
        defaultIndex={defaultPassengerTabIndex(view.passengers, "planning")}
        ariaLabel="مسافر برای برنامه‌ریزی"
      >
        {details.passengers.map((trip) => (
          <TripAssignmentPlanner
            key={trip.tripId}
            tripRequestId={details.tripRequestId}
            trip={trip}
            assignments={assignments.get(trip.tripId) ?? []}
            scheduledDateTime={
              trip.requestedPickupDateTime ?? details.requestedTravelDateTime
            }
            execution={persistedPlanningExecution(trip.executions)}
            requestIsTerminal={requestIsTerminal}
          />
        ))}
      </TripWorkspacePassengerPanel>

      {details.passengers.flatMap((trip) => [
        ...trip.routes.map((route) => (
          <RouteCard
            key={`trip-${route.routeId}`}
            route={route}
            label={`مسیر برنامه‌ریزی‌شدهٔ ${trip.passenger.firstName} ${trip.passenger.lastName}`}
          />
        )),
        ...trip.executions.flatMap((item) =>
          item.routes.map((route) => (
            <RouteCard
              key={`execution-${route.routeId}`}
              route={route}
              label={`مسیر برگشتی موجود برای ${trip.passenger.firstName} ${trip.passenger.lastName} — فقط نمایش`}
            />
          )),
        ),
      ])}

      {!requestIsTerminal && (
        <details className={styles.disclosure}>
          <summary>ثبت مسیر برنامه‌ریزی‌شده (اختیاری)</summary>
          <TripRouteForm
            tripRequestId={details.tripRequestId}
            passengers={details.passengers}
            locations={locations}
          />
        </details>
      )}

      <p className={styles.infoBanner}>
        پس از تکمیل برنامه‌ریزی، سفر آماده اجرا خواهد شد. لطفاً تمامی اطلاعات
        ضروری را تکمیل کنید.
      </p>
    </section>
  );
}

function ExecutionTab({
  details,
  view,
  requestIsTerminal,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  requestIsTerminal: boolean;
}) {
  const switcherItems = view.passengers.map((item, index) => ({
    tripId: item.tripId,
    label: `مسافر ${index + 1}`,
    badge: item.executionStatus
      ? executionStatusLabel(item.executionStatus)
      : "بدون اجرا",
  }));

  return (
    <section
      id="workspace-tab-execution"
      className={styles.tabPanel}
      aria-labelledby="execution-heading"
    >
      <h2 id="execution-heading" tabIndex={-1}>
        اجرای سفر
      </h2>
      <p className={styles.muted}>
        پس از حرکت و بازگشت، زمان و کیلومتر واقعی را از برگهٔ کاغذی ثبت کنید.
      </p>

      {shouldShowStatusControl(view.nextAction, "execution") && (
        <TripRequestStatusControl details={details} view={view} />
      )}

      <TripWorkspacePassengerPanel
        items={switcherItems}
        defaultIndex={defaultPassengerTabIndex(view.passengers, "execution")}
        ariaLabel="مسافر برای اجرا"
      >
        {details.passengers.map((trip, index) => {
          const item = view.passengers[index];
          if (!item) return null;
          const active = currentNonTerminalExecution(trip.executions);
          return (
            <article className={styles.groupCard} key={trip.tripId}>
              <h3>{item.personName}</h3>
              {trip.executions.length === 0 ? (
                <p className={styles.muted}>
                  ابتدا خودرو و راننده را در بخش برنامه‌ریزی سفر ثبت کنید.
                </p>
              ) : (
                trip.executions.map((execution) => (
                  <div
                    className={styles.executionRecord}
                    key={execution.tripExecutionId}
                  >
                    <p className={styles.muted}>
                      {executionStatusLabel(execution.status)} — حرکت:{" "}
                      {formatTripDateTime(execution.actualPickupDateTime)} —
                      بازگشت:{" "}
                      {formatTripDateTime(execution.actualDropoffDateTime)} —
                      کیلومتر: {execution.startOdometer ?? "—"} تا{" "}
                      {execution.endOdometer ?? "—"}
                    </p>
                    {hasExecutionDescription(execution.description) && (
                      <p className={styles.muted}>
                        <span className={styles.inlineLabel}>توضیحات اجرا:</span>{" "}
                        {execution.description}
                      </p>
                    )}
                  </div>
                ))
              )}
              {active &&
                !requestIsTerminal &&
                (details.status === "Assigned" ||
                  details.status === "InProgress") && (
                  <TripExecutionForm
                    tripRequestId={details.tripRequestId}
                    trip={trip}
                    execution={active}
                  />
                )}
              {active && details.status === "New" && (
                <p className={styles.muted}>
                  پس از ثبت تخصیص‌یافته، زمان واقعی حرکت اینجا وارد می‌شود.
                </p>
              )}
            </article>
          );
        })}
      </TripWorkspacePassengerPanel>
    </section>
  );
}

function CompletionTab({
  details,
  view,
  requestIsTerminal,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
  requestIsTerminal: boolean;
}) {
  const surveyedCount = view.passengers.filter((item) => {
    const trip = details.passengers.find(
      (passenger) => passenger.tripId === item.tripId,
    );
    return trip?.executions.some(
      (execution) =>
        execution.status === "Completed" &&
        execution.passengerRating !== null,
    );
  }).length;
  const completedExecutions = view.passengers.filter((item) =>
    item.executionStatus === "Completed",
  ).length;

  return (
    <section
      id="workspace-tab-completion"
      className={styles.tabPanel}
      aria-labelledby="completion-heading"
    >
      <h2 id="completion-heading" tabIndex={-1}>
        تکمیل درخواست
      </h2>
      <div className={styles.completionSummary}>
        <StatusBadge label={view.statusLabel} tone="info" />
        <StatusBadge
          label={
            completedExecutions === view.passengerCount
              ? "همه اجراها انجام شده"
              : "اجرای همه مسافران تکمیل نشده"
          }
          tone={
            completedExecutions === view.passengerCount ? "positive" : "warning"
          }
        />
      </div>

      {shouldShowStatusControl(view.nextAction, "completion") && (
        <TripRequestStatusControl details={details} view={view} />
      )}

      <h3 className={styles.subheading}>نظرسنجی مسافران</h3>
      <p className={styles.muted}>
        {completionSurveyProgressLine(surveyedCount, view.passengerCount)}
      </p>

      <div className={styles.stack}>
        {view.passengers.map((item) => {
          const trip = details.passengers.find(
            (passenger) => passenger.tripId === item.tripId,
          );
          if (!trip) return null;
          const completed = trip.executions.filter(
            (execution) => execution.status === "Completed",
          );
          return (
            <article className={styles.groupCard} key={item.tripId}>
              <div className={styles.summaryHeader}>
                <h3>{item.personName}</h3>
                <StatusBadge
                  label={
                    completed.some((e) => e.passengerRating !== null)
                      ? "نظرسنجی ثبت شده"
                      : "نظرسنجی ثبت نشده"
                  }
                  tone={
                    completed.some((e) => e.passengerRating !== null)
                      ? "positive"
                      : "warning"
                  }
                />
              </div>
              {completed.length === 0 ? (
                <p className={styles.muted}>
                  پس از تکمیل اجرای این مسافر، نظرسنجی اینجا ثبت می‌شود.
                </p>
              ) : (
                completed.map((execution) => (
                  <div className={styles.stack} key={execution.tripExecutionId}>
                    <p className={styles.muted}>
                      امتیاز:{" "}
                      {execution.passengerRating === null
                        ? "ثبت نشده"
                        : execution.passengerRating}{" "}
                      — {formatTripDateTime(execution.surveyDateTime)}
                    </p>
                    {item.canSurvey && !requestIsTerminal && (
                      <PassengerSurveyForm
                        tripRequestId={details.tripRequestId}
                        execution={execution}
                      />
                    )}
                  </div>
                ))
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ActiveTabPanel({
  section,
  details,
  view,
  assignments,
  locations,
  requestIsTerminal,
}: {
  section: WorkspaceSectionId;
  details: TripRequestDetails;
  view: TripWorkspaceView;
  assignments: Map<number, TripAssignmentReference[]>;
  locations: Awaited<ReturnType<ReturnType<typeof makeReadTrips>["availableLocations"]>>;
  requestIsTerminal: boolean;
}) {
  switch (section) {
    case "planning":
      return (
        <PlanningTab
          details={details}
          view={view}
          assignments={assignments}
          locations={locations}
          requestIsTerminal={requestIsTerminal}
        />
      );
    case "execution":
      return (
        <ExecutionTab
          details={details}
          view={view}
          requestIsTerminal={requestIsTerminal}
        />
      );
    case "completion":
      return (
        <CompletionTab
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
  const assignmentEntries = await Promise.all(
    details.passengers.map(
      async (trip) =>
        [
          trip.tripId,
          await reader.assignmentsActiveAt(
            trip.requestedPickupDateTime ?? details.requestedTravelDateTime,
          ),
        ] as const,
    ),
  );
  const assignments = new Map<number, TripAssignmentReference[]>(
    assignmentEntries,
  );
  const locations = await reader.availableLocations();
  const requestIsTerminal =
    details.status === "Completed" || details.status === "Cancelled";

  return (
    <PageShell>
      <TripWorkspaceFocus sectionId={section} />
      <div className={styles.workspace}>
        <WorkspaceIdentity view={view} backHref="/trips/requests" />
        <TripWorkspaceTabs
          tripRequestId={details.tripRequestId}
          activeSection={section}
        />
        <ActiveTabPanel
          section={section}
          details={details}
          view={view}
          assignments={assignments}
          locations={locations}
          requestIsTerminal={requestIsTerminal}
        />
      </div>
    </PageShell>
  );
}
