import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link/back-link";
import { DataTable } from "@/components/ui/data-table/data-table";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "@/components/ui/record-cards/record-cards";
import { ResultState } from "@/components/ui/result-state/result-state";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { TechnicalValue } from "@/components/ui/technical-value/technical-value";
import type {
  TripAssignmentReference,
  TripRequestDetails,
  TripRoute,
} from "../application/trip-records";
import { makeReadTrips } from "../composition/trip.factory";
import { TripAssignmentPlanner } from "./trip-assignment-form";
import { TripExecutionForm } from "./trip-execution-form";
import { TripIncidentForms } from "./incident/incident-forms";
import { TripRequestStatusForm } from "./trip-request-status-form";
import { TripRouteForm } from "./trip-route-form";
import { PassengerSurveyForm } from "./trip-survey-form";
import {
  currentNonTerminalExecution,
  persistedPlanningExecution,
} from "./trip-execution-current";
import { formatTripDateTime } from "./trip-format";
import {
  executionStatusLabel,
  requestStatusLabel,
} from "./trip-status";
import styles from "./trip-pages.module.css";

type TripTab =
  | "general"
  | "passengers"
  | "assignment"
  | "route"
  | "execution"
  | "survey";

const TABS: Array<{ value: TripTab; label: string }> = [
  { value: "general", label: "اطلاعات عمومی" },
  { value: "passengers", label: "مسافران" },
  { value: "assignment", label: "خودرو و راننده" },
  { value: "route", label: "مسیر" },
  { value: "execution", label: "اجراء و زمان‌بندی" },
  { value: "survey", label: "نظرسنجی مسافران" },
];

function TripTabs({
  requestId,
  active,
}: {
  requestId: number;
  active: TripTab;
}) {
  return (
    <nav className={styles.tabs} aria-label="بخش‌های پرونده سفر">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={`/trips/${requestId}?tab=${tab.value}`}
          className={active === tab.value ? styles.activeTab : styles.tab}
          aria-current={active === tab.value ? "page" : undefined}
          scroll={false}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function RequestLifecycle({ status }: { status: string }) {
  if (status === "Cancelled") {
    return (
      <div className={styles.lifecycle} aria-label="وضعیت مراحل درخواست">
        <span className={styles.lifecycleCancelled}>درخواست لغو شده است</span>
      </div>
    );
  }
  const statuses = ["New", "Assigned", "InProgress", "Completed"];
  const currentIndex = statuses.indexOf(status);
  if (currentIndex === -1) return null;
  return (
    <div className={styles.lifecycle} aria-label="وضعیت مراحل درخواست">
      {statuses.map((step, index) => (
        <span
          key={step}
          className={
            index < currentIndex
              ? styles.lifecycleDone
              : index === currentIndex
                ? styles.lifecycleCurrent
                : styles.lifecycleStep
          }
        >
          {requestStatusLabel(step)}
        </span>
      ))}
    </div>
  );
}

function GeneralTab({ details }: { details: TripRequestDetails }) {
  return (
    <section className={styles.tabPanel} aria-labelledby="general-heading">
      <h2 id="general-heading">اطلاعات عمومی</h2>
      <dl className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <dt>شمارهٔ درخواست</dt>
          <dd>
            <TechnicalValue>{details.requestNo}</TechnicalValue>
          </dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>نوع درخواست</dt>
          <dd>{details.requestType.typeName}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>وضعیت</dt>
          <dd>
            <StatusBadge
              label={requestStatusLabel(details.status)}
              tone="info"
            />
          </dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>زمان ثبت درخواست</dt>
          <dd>{formatTripDateTime(details.requestDateTime)}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>زمان برنامه‌ریزی‌شده</dt>
          <dd>{formatTripDateTime(details.requestedTravelDateTime)}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>تعداد مسافران</dt>
          <dd>{details.passengers.length}</dd>
        </div>
        <div className={`${styles.summaryItem} ${styles.wideSummary}`}>
          <dt>هدف سفر</dt>
          <dd>{details.purpose ?? "ثبت نشده"}</dd>
        </div>
        <div className={`${styles.summaryItem} ${styles.wideSummary}`}>
          <dt>توضیحات</dt>
          <dd>{details.description ?? "ثبت نشده"}</dd>
        </div>
      </dl>
      <RequestLifecycle status={details.status} />
      <p className={styles.muted}>
        مبدأ، مقصد و زمان سوارشدن در سطح سفر هر مسافر نگهداری می‌شود و در
        بخش «مسافران» نمایش داده شده است.
      </p>
      <TripRequestStatusForm details={details} />
    </section>
  );
}

function PassengersTab({ details }: { details: TripRequestDetails }) {
  return (
    <section className={styles.tabPanel} aria-labelledby="passengers-heading">
      <h2 id="passengers-heading">مسافران</h2>
      {details.passengers.length === 0 ? (
        <ResultState
          title="مسافری ثبت نشده"
          description="برای این درخواست هنوز مسافری ثبت نشده است."
        />
      ) : (
        <>
          <DataTable caption="مسافران درخواست سفر" minWidth={960}>
            <thead>
              <tr>
                <th>مسافر</th>
                <th>شمارهٔ پرسنلی / موبایل</th>
                <th>مبدأ</th>
                <th>مقصد</th>
                <th>زمان درخواست‌شده</th>
                <th>ترتیب سوار / پیاده</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {details.passengers.map((trip) => (
                <tr key={trip.tripId}>
                  <td>
                    {trip.passenger.firstName} {trip.passenger.lastName}
                  </td>
                  <td>
                    <TechnicalValue>
                      {trip.passenger.personnelNo ??
                        trip.passenger.mobile ??
                        "—"}
                    </TechnicalValue>
                  </td>
                  <td>{trip.origin.locationName}</td>
                  <td>{trip.destination.locationName}</td>
                  <td>
                    {formatTripDateTime(
                      trip.requestedPickupDateTime ??
                        details.requestedTravelDateTime,
                    )}
                  </td>
                  <td>
                    <TechnicalValue>
                      {trip.pickupOrder ?? "—"} / {trip.dropoffOrder ?? "—"}
                    </TechnicalValue>
                  </td>
                  <td>
                    {trip.status ? (
                      <StatusBadge label={trip.status} tone="info" />
                    ) : (
                      "ثبت نشده"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <RecordCardList>
            {details.passengers.map((trip) => (
              <RecordCard key={trip.tripId}>
                <RecordCardHeader
                  title={`${trip.passenger.firstName} ${trip.passenger.lastName}`}
                  badge={
                    trip.status ? (
                      <StatusBadge label={trip.status} tone="info" />
                    ) : undefined
                  }
                />
                <RecordCardDetails>
                  <RecordCardDetail label="مبدأ">
                    {trip.origin.locationName}
                  </RecordCardDetail>
                  <RecordCardDetail label="مقصد">
                    {trip.destination.locationName}
                  </RecordCardDetail>
                  <RecordCardDetail label="زمان">
                    {formatTripDateTime(
                      trip.requestedPickupDateTime ??
                        details.requestedTravelDateTime,
                    )}
                  </RecordCardDetail>
                  <RecordCardDetail label="ترتیب سوار / پیاده">
                    {trip.pickupOrder ?? "—"} / {trip.dropoffOrder ?? "—"}
                  </RecordCardDetail>
                </RecordCardDetails>
                {trip.description && <p>{trip.description}</p>}
              </RecordCard>
            ))}
          </RecordCardList>
        </>
      )}
    </section>
  );
}

function AssignmentTab({
  details,
  assignments,
}: {
  details: TripRequestDetails;
  assignments: Map<number, TripAssignmentReference[]>;
}) {
  const requestIsTerminal =
    details.status === "Completed" || details.status === "Cancelled";
  return (
    <section className={styles.tabPanel} aria-labelledby="assignment-heading">
      <h2 id="assignment-heading">خودرو و راننده</h2>
      <p className={styles.muted}>
        تخصیص انتخاب‌شده به‌صورت برنامهٔ سفر ذخیره می‌شود. برگهٔ مأموریت فقط از
        همین برنامه صادر می‌گردد. راننده یا خودروی غیرفعال واجد شرایط نیست.
      </p>
      <div className={styles.stack}>
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
      </div>
    </section>
  );
}

function RouteCard({
  route,
  label,
}: {
  route: TripRoute;
  label: string;
}) {
  return (
    <article className={styles.entityCard}>
      <div className={styles.entityHeader}>
        <h3>{route.routeName}</h3>
        <StatusBadge
          label={route.isSelected ? "مسیر انتخاب‌شده" : "مسیر جایگزین"}
          tone={route.isSelected ? "positive" : "info"}
        />
      </div>
      <p className={styles.muted}>{label}</p>
      <div className={styles.routeMeta}>
        <span>شماره جایگزین: {route.alternativeNo ?? "—"}</span>
        <span>مسافت: {route.distanceKm ?? "—"} کیلومتر</span>
        <span>مدت: {route.estimatedDurationMinute ?? "—"} دقیقه</span>
      </div>
      {route.points.length === 0 ? (
        <p className={styles.muted}>نقطه‌ای برای این مسیر ثبت نشده است.</p>
      ) : (
        <ol className={styles.routePoints}>
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

function RouteTab({
  details,
  locations,
}: {
  details: TripRequestDetails;
  locations: Awaited<ReturnType<ReturnType<typeof makeReadTrips>["availableLocations"]>>;
}) {
  const hasRoutes = details.passengers.some(
    (trip) =>
      trip.routes.length > 0 ||
      trip.executions.some((execution) => execution.routes.length > 0),
  );
  return (
    <section className={styles.tabPanel} aria-labelledby="route-heading">
      <h2 id="route-heading">مسیر</h2>
      <p className={styles.muted}>
        در این بخش فقط مسیر برنامه‌ریزی‌شده ثبت می‌شود. انحراف مسیر، توقف‌ها و
        زمان واقعی حرکت روی برگهٔ مأموریت دست‌نویس می‌ماند و پس از بازگشت در
        بخش اجراء ثبت می‌گردد.
      </p>
      {!hasRoutes && (
        <ResultState
          title="مسیری ثبت نشده"
          description="مسیر برنامه‌ریزی‌شده (مبدأ، مقصد و نقاط میانی) را برای هر مسافر ثبت کنید. انحراف مسیر و توقف‌های واقعی روی برگهٔ مأموریت دست‌نویس می‌ماند."
        />
      )}
      <div className={styles.stack}>
        {details.passengers.flatMap((trip) => [
          ...trip.routes.map((route) => (
            <RouteCard
              key={`trip-${route.routeId}`}
              route={route}
              label={`مسیر برنامه‌ریزی‌شدهٔ ${trip.passenger.firstName} ${trip.passenger.lastName}`}
            />
          )),
          ...trip.executions.flatMap((execution) =>
            execution.routes.map((route) => (
              <RouteCard
                key={`execution-${route.routeId}`}
                route={route}
              label={`مسیر برگشتی موجود برای ${trip.passenger.firstName} ${trip.passenger.lastName} — فقط نمایش؛ انحراف مسیر روی برگهٔ کاغذی ثبت می‌شود`}
              />
            )),
          ),
        ])}
      </div>
      {details.status !== "Completed" && details.status !== "Cancelled" && (
      <TripRouteForm
        tripRequestId={details.tripRequestId}
        passengers={details.passengers}
        locations={locations}
      />
      )}
    </section>
  );
}

function ExecutionTab({
  details,
}: {
  details: TripRequestDetails;
}) {
  const requestIsTerminal =
    details.status === "Completed" || details.status === "Cancelled";
  return (
    <section className={styles.tabPanel} aria-labelledby="execution-heading">
      <h2 id="execution-heading">اجراء و زمان‌بندی</h2>
      <p className={styles.muted}>
        پس از بازگشت برگهٔ کاغذی، زمان‌ها و کیلومتر واقعی را اینجا ثبت کنید.
        تخصیص خودرو در بخش «خودرو و راننده» نگهداری می‌شود.
      </p>
      <div className={styles.stack}>
        {details.passengers.map((trip) => {
          const active = currentNonTerminalExecution(trip.executions);
          return (
            <section className={styles.stack} key={trip.tripId}>
              {trip.executions.length === 0 ? (
                <ResultState
                  title="برنامه‌ای ثبت نشده"
                  description="ابتدا در بخش خودرو و راننده تخصیص را ذخیره کنید."
                />
              ) : (
                trip.executions.map((execution) => (
                  <article
                    className={styles.entityCard}
                    key={execution.tripExecutionId}
                  >
                    <div className={styles.entityHeader}>
                      <h3>
                        {trip.passenger.firstName} {trip.passenger.lastName}
                      </h3>
                      <StatusBadge
                        label={executionStatusLabel(execution.status)}
                        tone="info"
                      />
                    </div>
                    <div className={styles.assignmentMeta}>
                      <span>
                        راننده: {execution.assignment.driverFirstName}{" "}
                        {execution.assignment.driverLastName}
                      </span>
                      <span>
                        سوارشدن واقعی:{" "}
                        {formatTripDateTime(execution.actualPickupDateTime)}
                      </span>
                      <span>
                        پیاده‌شدن واقعی:{" "}
                        {formatTripDateTime(execution.actualDropoffDateTime)}
                      </span>
                      <span>
                        کیلومتر: {execution.startOdometer ?? "—"} تا{" "}
                        {execution.endOdometer ?? "—"}
                      </span>
                    </div>
                  </article>
                ))
              )}
              {active && !requestIsTerminal && (
                <TripExecutionForm
                  tripRequestId={details.tripRequestId}
                  trip={trip}
                  execution={active}
                />
              )}
              {trip.executions
                .filter((execution) => execution.status === "Completed")
                .map((execution) => (
                  <TripIncidentForms
                    key={`incident-${execution.tripExecutionId}`}
                    tripRequestId={details.tripRequestId}
                    execution={execution}
                  />
                ))}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function SurveyTab({ details }: { details: TripRequestDetails }) {
  const completed = details.passengers.flatMap((trip) =>
    trip.executions
      .filter((execution) => execution.status === "Completed")
      .map((execution) => ({ trip, execution })),
  );
  return (
    <section className={styles.tabPanel} aria-labelledby="survey-heading">
      <h2 id="survey-heading">نظرسنجی مسافران</h2>
      {completed.length === 0 ? (
        <ResultState
          title="اجرای تکمیل‌شده‌ای برای نظرسنجی موجود نیست"
          description="نظرسنجی فقط پس از تکمیل اجرا ثبت می‌شود. مقیاس استاندارد امتیاز در سامانه مشخص نشده و به‌صورت عدد اختیاری وارد می‌شود."
        />
      ) : (
        <div className={styles.stack}>
          {completed.map(({ trip, execution }) => (
            <section className={styles.stack} key={execution.tripExecutionId}>
              <div>
                <h3>
                  {trip.passenger.firstName} {trip.passenger.lastName}
                </h3>
                <p className={styles.muted}>
                  {execution.passengerRating === null
                    ? "بدون امتیاز"
                    : `امتیاز ${execution.passengerRating}`}
                  {" — "}
                  {formatTripDateTime(execution.surveyDateTime)}
                </p>
              </div>
              {details.status !== "Cancelled" && (
                <PassengerSurveyForm
                  tripRequestId={details.tripRequestId}
                  execution={execution}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export async function TripRequestDetailsPage({
  tripRequestId,
  requestedTab,
}: {
  tripRequestId: number;
  requestedTab?: string;
}) {
  const reader = makeReadTrips();
  const details = await reader.details(tripRequestId);
  if (!details) notFound();
  const tab = TABS.some(({ value }) => value === requestedTab)
    ? (requestedTab as TripTab)
    : "general";

  const needsAssignments = tab === "assignment" || tab === "execution";
  const assignmentEntries = needsAssignments
    ? await Promise.all(
        details.passengers.map(async (trip) => [
          trip.tripId,
          await reader.assignmentsActiveAt(
            trip.requestedPickupDateTime ??
              details.requestedTravelDateTime,
          ),
        ] as const),
      )
    : [];
  const assignments = new Map(assignmentEntries);
  const locations =
    tab === "route" ? await reader.availableLocations() : [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="پروندهٔ سفر"
        title={`درخواست ${details.requestNo}`}
        description={
          <span>
            {details.requestType.typeName} —{" "}
            {formatTripDateTime(details.requestedTravelDateTime)}
          </span>
        }
        action={<BackLink href="/trips/requests" label="بازگشت به سفرها" />}
        compactAction
      />
      <TripTabs requestId={tripRequestId} active={tab} />
      {tab === "general" && <GeneralTab details={details} />}
      {tab === "passengers" && <PassengersTab details={details} />}
      {tab === "assignment" && (
        <AssignmentTab details={details} assignments={assignments} />
      )}
      {tab === "route" && (
        <RouteTab details={details} locations={locations} />
      )}
      {tab === "execution" && <ExecutionTab details={details} />}
      {tab === "survey" && <SurveyTab details={details} />}
    </PageShell>
  );
}
