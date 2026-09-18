import Link from "next/link";

import { ActionLink } from "@/components/ui/action-link/action-link";
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
import { makeReadTrips } from "../composition/trip.factory";
import {
  formatTripDateTime,
  locationSummary,
  singleSearchParam,
} from "./trip-format";
import { TripFilters } from "./trip-filters";
import { requestStatusLabel } from "./trip-status";
import styles from "./trip-pages.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

function requestLink(id: number) {
  return (
    <ActionLink href={`/trips/${id}`} variant="quiet">
      مشاهده جزئیات
    </ActionLink>
  );
}

export async function TripsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const search = singleSearchParam(searchParams.search) ?? "";
  const status = singleSearchParam(searchParams.status) ?? "";
  const requestedPage = Number(singleSearchParam(searchParams.page) ?? 1);
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
                  <td>{formatTripDateTime(request.requestedTravelDateTime)}</td>
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
                    {formatTripDateTime(request.requestedTravelDateTime)}
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
