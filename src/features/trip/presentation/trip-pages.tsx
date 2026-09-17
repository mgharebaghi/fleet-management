import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionLink } from "@/components/ui/action-link/action-link";
import { BackLink } from "@/components/ui/back-link/back-link";
import { DataTable } from "@/components/ui/data-table/data-table";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { Pagination } from "@/components/ui/pagination/pagination";
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
import { VehiclePlate } from "@/features/fleet/presentation/vehicles/list-vehicles/vehicle-plate";
import type {
  TripAssignmentReference,
  TripPassengerRecord,
  TripRequestDetails,
  TripRoute,
} from "../application/trip-records";
import { makeReadTrips } from "../composition/trip.factory";
import { CreateTripRequestForm } from "./create-trip-request-form";
import {
  PassengerSurveyForm,
  TripExecutionForm,
  TripRequestStatusForm,
  TripRouteForm,
} from "./trip-detail-forms";
import { TripFilters } from "./trip-filters";
import {
  executionStatusLabel,
  requestStatusLabel,
} from "./trip-status";
import styles from "./trip-pages.module.css";

type SearchParams = Record<string, string | string[] | undefined>;
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

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: Date | null) {
  return value ? dateTimeFormatter.format(value) : "ثبت نشده";
}

function locationSummary(values: string[], multipleLabel: string) {
  if (values.length === 0) return "ثبت نشده";
  return values.length === 1 ? values[0] : multipleLabel;
}

function requestLink(id: number) {
  return (
    <ActionLink href={`/trips/${id}`} variant="quiet">
      مشاهده جزئیات
    </ActionLink>
  );
}

export function TripsLandingPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title="سفرها"
        description="ثبت و مدیریت درخواست‌ها و سفرهای انجام‌شده"
      />
      <div className={styles.landing}>
        <Link href="/trips/create" className={styles.landingCard}>
          <span className={styles.landingIcon} aria-hidden="true">
            +
          </span>
          <strong>ثبت درخواست سفر</strong>
          <span>ایجاد درخواست جدید و افزودن مسافران</span>
        </Link>
        <Link href="/trips/requests" className={styles.landingCard}>
          <span className={styles.landingIcon} aria-hidden="true">
            ≡
          </span>
          <strong>مشاهده سفرها</strong>
          <span>فهرست درخواست‌ها و پرونده‌های سفر</span>
        </Link>
      </div>
    </PageShell>
  );
}

export async function TripsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = single(searchParams.search) ?? "";
  const status = single(searchParams.status) ?? "";
  const requestedPage = Number(single(searchParams.page) ?? 1);
  const page =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0 &&
    requestedPage <= 1_000_000
      ? requestedPage
      : 1;
  const result = await makeReadTrips().list(search, status, page);

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title="سفرها"
        description="ثبت درخواست، برنامه‌ریزی، صدور قبض راننده و ثبت اطلاعات برگشتی"
        action={
          <ActionLink href="/trips/create" variant="primary">
            ثبت درخواست سفر
          </ActionLink>
        }
      />
      <TripFilters
        search={search}
        status={status}
        statuses={result.statuses}
      />
      {result.requests.length === 0 ? (
        <ResultState
          title="درخواست سفری پیدا نشد"
          description="جستجو یا وضعیت را تغییر دهید، یا یک درخواست سفر ثبت کنید."
        />
      ) : (
        <>
          <DataTable caption="درخواست‌های سفر" minWidth={840}>
            <thead>
              <tr>
                <th>شمارهٔ درخواست</th>
                <th>نوع درخواست</th>
                <th>مبدأ</th>
                <th>مقصد</th>
                <th>زمان برنامه‌ریزی‌شده</th>
                <th>مسافران</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {result.requests.map((request) => (
                <tr key={request.tripRequestId}>
                  <td>
                    <Link
                      href={`/trips/${request.tripRequestId}`}
                      className={styles.recordLink}
                    >
                      <TechnicalValue>{request.requestNo}</TechnicalValue>
                    </Link>
                  </td>
                  <td>{request.requestTypeName}</td>
                  <td>{locationSummary(request.origins, "چند مبدأ")}</td>
                  <td>{locationSummary(request.destinations, "چند مقصد")}</td>
                  <td>{formatDateTime(request.requestedTravelDateTime)}</td>
                  <td>{request.passengerCount}</td>
                  <td>
                    <StatusBadge
                      label={requestStatusLabel(request.status)}
                      tone="info"
                    />
                  </td>
                  <td>{requestLink(request.tripRequestId)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <RecordCardList>
            {result.requests.map((request) => (
              <RecordCard key={request.tripRequestId}>
                <RecordCardHeader
                  title={
                    <TechnicalValue>{request.requestNo}</TechnicalValue>
                  }
                  badge={
                    <StatusBadge
                      label={requestStatusLabel(request.status)}
                      tone="info"
                    />
                  }
                />
                <RecordCardDetails>
                  <RecordCardDetail label="نوع">
                    {request.requestTypeName}
                  </RecordCardDetail>
                  <RecordCardDetail label="مبدأ">
                    {locationSummary(request.origins, "چند مبدأ")}
                  </RecordCardDetail>
                  <RecordCardDetail label="مقصد">
                    {locationSummary(request.destinations, "چند مقصد")}
                  </RecordCardDetail>
                  <RecordCardDetail label="زمان سفر">
                    {formatDateTime(request.requestedTravelDateTime)}
                  </RecordCardDetail>
                  <RecordCardDetail label="مسافران">
                    {request.passengerCount}
                  </RecordCardDetail>
                </RecordCardDetails>
                {requestLink(request.tripRequestId)}
              </RecordCard>
            ))}
          </RecordCardList>
        </>
      )}
      <Pagination
        label="صفحه‌های درخواست سفر"
        currentPage={page}
        totalPages={Math.ceil(result.totalCount / 20)}
        buildHref={(nextPage) => {
          const query = new URLSearchParams();
          for (const [key, value] of Object.entries(searchParams)) {
            if (value === undefined) continue;
            for (const item of Array.isArray(value) ? value : [value]) {
              query.append(key, item);
            }
          }
          query.set("page", String(nextPage));
          return `/trips/requests?${query}`;
        }}
      />
    </PageShell>
  );
}

export async function CreateTripRequestPage() {
  const reader = makeReadTrips();
  const [requestTypes, people, locations] = await Promise.all([
    reader.requestTypes(),
    reader.availablePeople(),
    reader.availableLocations(),
  ]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title="ثبت درخواست سفر"
        description="اطلاعات درخواست و مسیر هر مسافر را بر پایهٔ پرونده‌های موجود ثبت کنید."
        action={<BackLink href="/trips/requests" label="بازگشت به سفرها" />}
        compactAction
      />
      {requestTypes.length === 0 ? (
        <ResultState
          title="نوع درخواست موجود نیست"
          description="جدول مرجع نوع درخواست سفر باید پیش‌تر در SQL Server تکمیل شده باشد."
        />
      ) : people.length === 0 ? (
        <ResultState
          title="مسافر فعالی موجود نیست"
          description="برای ثبت درخواست، حداقل یک شخص فعال لازم است."
        />
      ) : locations.length === 0 ? (
        <ResultState
          title="مکان قابل استفاده‌ای موجود نیست"
          description="مبدأ و مقصد باید از مکان‌های موجود SQL Server انتخاب شوند."
        />
      ) : (
        <CreateTripRequestForm
          requestTypes={requestTypes}
          people={people}
          locations={locations}
        />
      )}
    </PageShell>
  );
}

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
          <dd>{formatDateTime(details.requestDateTime)}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt>زمان برنامه‌ریزی‌شده</dt>
          <dd>{formatDateTime(details.requestedTravelDateTime)}</dd>
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
      <TripRequestStatusForm
        tripRequestId={details.tripRequestId}
        status={details.status}
        hasStartedExecution={details.passengers.some((trip) =>
          trip.executions.some(
            (execution) =>
              execution.actualPickupDateTime !== null ||
              execution.status === "InProgress" ||
              execution.status === "Completed",
          ),
        )}
      />
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
          description="این درخواست در SQL Server رکورد Trip وابسته ندارد."
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
                    {formatDateTime(
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
                    {formatDateTime(
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

function assignmentCard(
  details: TripRequestDetails,
  trip: TripPassengerRecord,
  assignment: TripAssignmentReference,
) {
  return (
    <article
      className={styles.entityCard}
      key={`${trip.tripId}-${assignment.assignmentId}`}
    >
      <div className={styles.entityHeader}>
        <h3>
          {assignment.driverFirstName} {assignment.driverLastName}
        </h3>
        <StatusBadge
          label={
            assignment.hasEligibleLicense
              ? "گواهینامه معتبر در روز سفر"
              : "بدون گواهینامه معتبر"
          }
          tone={assignment.hasEligibleLicense ? "positive" : "negative"}
        />
      </div>
      <div className={styles.assignmentMeta}>
        <span>
          مسافر: {trip.passenger.firstName} {trip.passenger.lastName}
        </span>
        <span>
          شمارهٔ پرسنلی راننده:{" "}
          <TechnicalValue>
            {assignment.driverPersonnelNo ?? "—"}
          </TechnicalValue>
        </span>
      </div>
      <div className={styles.assignmentMeta}>
        <span>
          {assignment.vehicle.brandName} {assignment.vehicle.modelName}
        </span>
        <VehiclePlate vehicle={assignment.vehicle} />
        <span>
          کد خودرو:{" "}
          <TechnicalValue>{assignment.vehicle.vehicleCode}</TechnicalValue>
        </span>
      </div>
      <div className={styles.entityActions}>
        {assignment.hasEligibleLicense && (
          <ActionLink
            href={`/trips/${details.tripRequestId}/voucher/${trip.tripId}?assignmentId=${assignment.assignmentId}`}
            variant="primary"
          >
            صدور قبض سفر
          </ActionLink>
        )}
      </div>
    </article>
  );
}

function AssignmentTab({
  details,
  assignments,
}: {
  details: TripRequestDetails;
  assignments: Map<number, TripAssignmentReference[]>;
}) {
  return (
    <section className={styles.tabPanel} aria-labelledby="assignment-heading">
      <h2 id="assignment-heading">خودرو و راننده</h2>
      <p className={styles.muted}>
        فقط تخصیص‌هایی نمایش داده می‌شوند که در زمان برنامه‌ریزی‌شدهٔ همان
        مسافر فعال‌اند. این بخش سابقهٔ تخصیص رانندگان را تغییر نمی‌دهد.
      </p>
      <div className={styles.stack}>
        {details.passengers.map((trip) => {
          const available = assignments.get(trip.tripId) ?? [];
          return (
            <section className={styles.stack} key={trip.tripId}>
              <h3>
                {trip.passenger.firstName} {trip.passenger.lastName} —{" "}
                {formatDateTime(
                  trip.requestedPickupDateTime ??
                    details.requestedTravelDateTime,
                )}
              </h3>
              {available.length === 0 ? (
                <ResultState
                  title="تخصیص فعالی موجود نیست"
                  description="برای زمان این سفر، تخصیص خودرو و راننده‌ای در سابقهٔ رانندگان پیدا نشد."
                />
              ) : (
                available.map((assignment) =>
                  assignmentCard(details, trip, assignment),
                )
              )}
            </section>
          );
        })}
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
      {!hasRoutes && (
        <ResultState
          title="مسیری ثبت نشده"
          description="مسیر برنامه‌ریزی‌شده را برای سفر هر مسافر ثبت کنید."
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
                label={`مسیر اجرای ${execution.tripExecutionId} برای ${trip.passenger.firstName} ${trip.passenger.lastName}`}
              />
            )),
          ),
        ])}
      </div>
      <TripRouteForm
        tripRequestId={details.tripRequestId}
        passengers={details.passengers}
        locations={locations}
      />
    </section>
  );
}

function ExecutionTab({
  details,
  assignments,
}: {
  details: TripRequestDetails;
  assignments: Map<number, TripAssignmentReference[]>;
}) {
  return (
    <section className={styles.tabPanel} aria-labelledby="execution-heading">
      <h2 id="execution-heading">اجراء و زمان‌بندی</h2>
      <p className={styles.muted}>
        پس از بازگشت قبض کاغذی، زمان‌ها، کیلومتر و توضیحات واقعی را کارکنان
        اینجا با رکورد TripExecution تطبیق می‌دهند.
      </p>
      <div className={styles.stack}>
        {details.passengers.map((trip) => {
          const latest = trip.executions[0] ?? null;
          return (
            <section className={styles.stack} key={trip.tripId}>
              {trip.executions.map((execution) => (
                <article
                  className={styles.entityCard}
                  key={execution.tripExecutionId}
                >
                  <div className={styles.entityHeader}>
                    <h3>
                      اجرای <TechnicalValue>{execution.tripExecutionId}</TechnicalValue>
                    </h3>
                    <StatusBadge
                      label={executionStatusLabel(execution.status)}
                      tone="info"
                    />
                  </div>
                  <div className={styles.assignmentMeta}>
                    <span>
                      سوارشدن واقعی:{" "}
                      {formatDateTime(execution.actualPickupDateTime)}
                    </span>
                    <span>
                      پیاده‌شدن واقعی:{" "}
                      {formatDateTime(execution.actualDropoffDateTime)}
                    </span>
                    <span>
                      کیلومتر: {execution.startOdometer ?? "—"} تا{" "}
                      {execution.endOdometer ?? "—"}
                    </span>
                  </div>
                </article>
              ))}
              <TripExecutionForm
                tripRequestId={details.tripRequestId}
                trip={trip}
                assignments={assignments.get(trip.tripId) ?? []}
                execution={latest}
              />
            </section>
          );
        })}
      </div>
    </section>
  );
}

function SurveyTab({ details }: { details: TripRequestDetails }) {
  const executionPairs = details.passengers.flatMap((trip) =>
    trip.executions.map((execution) => ({ trip, execution })),
  );
  return (
    <section className={styles.tabPanel} aria-labelledby="survey-heading">
      <h2 id="survey-heading">نظرسنجی مسافران</h2>
      {executionPairs.length === 0 ? (
        <ResultState
          title="اجرایی برای نظرسنجی موجود نیست"
          description="نظرسنجی روی همان رکورد TripExecution مسافر ذخیره می‌شود."
        />
      ) : (
        <div className={styles.stack}>
          {executionPairs.map(({ trip, execution }) => (
            <section className={styles.stack} key={execution.tripExecutionId}>
              <div>
                <h3>
                  {trip.passenger.firstName} {trip.passenger.lastName}
                </h3>
                <p className={styles.muted}>
                  اجرای <TechnicalValue>{execution.tripExecutionId}</TechnicalValue>
                  {" — "}
                  {execution.passengerRating === null
                    ? "بدون امتیاز"
                    : `امتیاز ${execution.passengerRating}`}
                  {" — "}
                  {formatDateTime(execution.surveyDateTime)}
                </p>
              </div>
              <PassengerSurveyForm
                tripRequestId={details.tripRequestId}
                execution={execution}
              />
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
            {formatDateTime(details.requestedTravelDateTime)}
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
      {tab === "execution" && (
        <ExecutionTab details={details} assignments={assignments} />
      )}
      {tab === "survey" && <SurveyTab details={details} />}
    </PageShell>
  );
}
