import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link/back-link";
import { PageHeader } from "@/components/ui/page-header/page-header";
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
import { TripIncidentForms } from "../incident/incident-forms";
import { TripRouteForm } from "../trip-route-form";
import { PassengerSurveyForm } from "../trip-survey-form";
import {
  currentNonTerminalExecution,
  persistedPlanningExecution,
} from "../trip-execution-current";
import { formatTripDateTime } from "../trip-format";
import { executionStatusLabel } from "../trip-status";
import { TripNextActionBar } from "./trip-next-action-bar";
import { TripWorkflowProgress } from "./trip-workflow-progress";
import { TripWorkspaceFocus } from "./trip-workspace-focus";
import styles from "./trip-workspace.module.css";
import {
  projectTripWorkspace,
  workspaceSectionForTab,
  type TripWorkspaceView,
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

function WorkspaceSummary({ view }: { view: TripWorkspaceView }) {
  return (
    <section className={styles.summary} aria-labelledby="trip-summary-heading">
      <div className={styles.summaryHeader}>
        <h2 id="trip-summary-heading" tabIndex={-1}>
          {view.requestNo}
        </h2>
        <StatusBadge label={view.statusLabel} tone="info" />
      </div>
      <dl className={styles.summaryFacts}>
        <div>
          <dt>نوع درخواست</dt>
          <dd>{view.requestTypeName}</dd>
        </div>
        <div>
          <dt>زمان برنامه‌ریزی‌شده</dt>
          <dd>{formatTripDateTime(view.plannedAt)}</dd>
        </div>
        <div>
          <dt>تعداد مسافران</dt>
          <dd>{view.passengerCount}</dd>
        </div>
        <div>
          <dt>مبدأ</dt>
          <dd>{view.originSummary}</dd>
        </div>
        <div>
          <dt>مقصد</dt>
          <dd>{view.destinationSummary}</dd>
        </div>
        <div className={styles.wide}>
          <dt>هدف سفر</dt>
          <dd>{view.purpose ?? "ثبت نشده"}</dd>
        </div>
      </dl>
    </section>
  );
}

function DetailsSection({
  details,
  view,
}: {
  details: TripRequestDetails;
  view: TripWorkspaceView;
}) {
  return (
    <section
      id="details"
      className={styles.section}
      aria-labelledby="details-heading"
    >
      <h2 id="details-heading" tabIndex={-1}>
        جزئیات سفر و مسافران
      </h2>
      <div className={styles.passengerList}>
        {view.passengers.map((item) => (
          <article className={styles.passengerCard} key={item.tripId}>
            <div className={styles.summaryHeader}>
              <h3>{item.personName}</h3>
              <StatusBadge
                label={
                  item.executionStatus
                    ? executionStatusLabel(item.executionStatus)
                    : item.hasPlan
                      ? "برنامه ثبت شده"
                      : "نیازمند برنامه‌ریزی"
                }
                tone={item.hasPlan ? "positive" : "warning"}
              />
            </div>
            <dl className={styles.passengerFacts}>
              <div>
                <dt>شمارهٔ پرسنلی</dt>
                <dd>
                  <TechnicalValue>{item.personnelNo ?? "—"}</TechnicalValue>
                </dd>
              </div>
              <div>
                <dt>موبایل</dt>
                <dd>
                  <TechnicalValue>{item.mobile ?? "—"}</TechnicalValue>
                </dd>
              </div>
              <div>
                <dt>مبدأ</dt>
                <dd>{item.originName}</dd>
              </div>
              <div>
                <dt>مقصد</dt>
                <dd>{item.destinationName}</dd>
              </div>
              <div>
                <dt>زمان سوارشدن</dt>
                <dd>{formatTripDateTime(item.pickupAt)}</dd>
              </div>
              <div>
                <dt>ترتیب سوار / پیاده</dt>
                <dd>
                  {item.pickupOrder ?? "—"} / {item.dropoffOrder ?? "—"}
                </dd>
              </div>
              <div>
                <dt>وضعیت مسافر</dt>
                <dd>{item.passengerStatus ?? "ثبت نشده"}</dd>
              </div>
              {item.description && (
                <div className={styles.wide}>
                  <dt>توضیحات</dt>
                  <dd>{item.description}</dd>
                </div>
              )}
            </dl>
          </article>
        ))}
      </div>
      <details
        className={styles.disclosure}
        data-workspace-disclosure="details"
      >
        <summary>مشاهده جزئیات کامل</summary>
        <dl className={styles.summaryFacts}>
          <div>
            <dt>شمارهٔ درخواست</dt>
            <dd>
              <TechnicalValue>{details.requestNo}</TechnicalValue>
            </dd>
          </div>
          <div>
            <dt>زمان ثبت درخواست</dt>
            <dd>{formatTripDateTime(details.requestDateTime)}</dd>
          </div>
          <div>
            <dt>نوع درخواست</dt>
            <dd>{details.requestType.typeName}</dd>
          </div>
          <div>
            <dt>وضعیت</dt>
            <dd>{view.statusLabel}</dd>
          </div>
          <div className={styles.wide}>
            <dt>هدف سفر</dt>
            <dd>{details.purpose ?? "ثبت نشده"}</dd>
          </div>
          <div className={styles.wide}>
            <dt>توضیحات درخواست</dt>
            <dd>{details.description ?? "ثبت نشده"}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
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
  const disclosure =
    requestedTab === "route"
      ? "route"
      : requestedTab === "survey"
        ? "survey"
        : requestedTab === "general"
          ? "details"
          : undefined;
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
      <PageHeader
        eyebrow="پروندهٔ سفر"
        title={`سفر ${details.requestNo}`}
        description={`${details.requestType.typeName} — ${formatTripDateTime(details.requestedTravelDateTime)}`}
        action={<BackLink href="/trips/requests" label="بازگشت به سفرها" />}
        compactAction
      />
      <TripWorkspaceFocus sectionId={section} disclosure={disclosure} />
      <div className={styles.workspace}>
        <WorkspaceSummary view={view} />
        <TripWorkflowProgress stages={view.stages} />
        <TripNextActionBar details={details} view={view} />
        <nav className={styles.sectionNav} aria-label="بخش‌های پرونده سفر">
          <a href="#details">جزئیات سفر و مسافران</a>
          <a href="#planning">برنامه‌ریزی سفر</a>
          <a href="#execution">اجرای سفر</a>
          <a href="#return">بازگشت و تکمیل</a>
        </nav>

        <DetailsSection details={details} view={view} />

        <section
          id="planning"
          className={styles.section}
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
          <div className={styles.stack}>
            {details.passengers.map((trip) => (
              <TripAssignmentPlanner
                key={trip.tripId}
                tripRequestId={details.tripRequestId}
                trip={trip}
                assignments={assignments.get(trip.tripId) ?? []}
                scheduledDateTime={
                  trip.requestedPickupDateTime ??
                  details.requestedTravelDateTime
                }
                execution={persistedPlanningExecution(trip.executions)}
                requestIsTerminal={requestIsTerminal}
              />
            ))}
          </div>
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
            <details
              className={styles.disclosure}
              data-workspace-disclosure="route"
            >
              <summary>ثبت مسیر برنامه‌ریزی‌شده (اختیاری)</summary>
              <TripRouteForm
                tripRequestId={details.tripRequestId}
                passengers={details.passengers}
                locations={locations}
              />
            </details>
          )}
        </section>

        <section
          id="execution"
          className={styles.section}
          aria-labelledby="execution-heading"
        >
          <h2 id="execution-heading" tabIndex={-1}>
            اجرای سفر
          </h2>
          <p className={styles.muted}>
            پس از حرکت و بازگشت، زمان و کیلومتر واقعی را از برگهٔ کاغذی ثبت
            کنید.
          </p>
          <div className={styles.stack}>
            {details.passengers.map((trip) => {
              const active = currentNonTerminalExecution(trip.executions);
              return (
                <article className={styles.groupCard} key={trip.tripId}>
                  <h3>
                    {trip.passenger.firstName} {trip.passenger.lastName}
                  </h3>
                  {trip.executions.length === 0 ? (
                    <p className={styles.muted}>
                      ابتدا خودرو و راننده را در بخش برنامه‌ریزی سفر ثبت کنید.
                    </p>
                  ) : (
                    trip.executions.map((item) => (
                      <p className={styles.muted} key={item.tripExecutionId}>
                        {executionStatusLabel(item.status)} — حرکت:{" "}
                        {formatTripDateTime(item.actualPickupDateTime)} —
                        بازگشت: {formatTripDateTime(item.actualDropoffDateTime)}{" "}
                        — کیلومتر: {item.startOdometer ?? "—"} تا{" "}
                        {item.endOdometer ?? "—"}
                      </p>
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
          </div>
        </section>

        <section
          id="return"
          className={styles.section}
          aria-labelledby="return-heading"
        >
          <h2 id="return-heading" tabIndex={-1}>
            بازگشت و تکمیل
          </h2>
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
                  <h3>{item.personName}</h3>
                  {completed.length === 0 ? (
                    <p className={styles.muted}>
                      پس از تکمیل اجرای این مسافر، تصادف، تخلف و نظرسنجی اینجا
                      ثبت می‌شود.
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
                        <details className={styles.disclosure}>
                          <summary>ثبت تصادف یا تخلف</summary>
                          <TripIncidentForms
                            tripRequestId={details.tripRequestId}
                            execution={execution}
                          />
                        </details>
                        {item.canSurvey && (
                          <details
                            className={styles.disclosure}
                            data-workspace-disclosure="survey"
                          >
                            <summary>ثبت نظرسنجی مسافر</summary>
                            <PassengerSurveyForm
                              tripRequestId={details.tripRequestId}
                              execution={execution}
                            />
                          </details>
                        )}
                      </div>
                    ))
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
