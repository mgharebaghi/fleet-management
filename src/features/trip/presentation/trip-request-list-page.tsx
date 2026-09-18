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
import { formatTripDateTime, singleSearchParam } from "./trip-format";
import { TripFilters } from "./trip-filters";
import { projectTripListItem } from "./workspace/trip-workspace-view";
import styles from "./trip-pages.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

function requestLink(id: number) {
  return (
    <ActionLink href={`/trips/${id}`} variant="quiet">
      مشاهده جزئیات سفر
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
  const rows = result.requests.map(projectTripListItem);

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title="سفرها"
        description="ثبت درخواست، برنامه‌ریزی، اعزام، بازگشت و تکمیل"
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
      {rows.length === 0 ? (
        <ResultState
          title="درخواست سفری پیدا نشد"
          description="جستجو یا وضعیت را تغییر دهید، یا یک درخواست سفر ثبت کنید."
        />
      ) : (
        <>
          <div className={styles.listTable}>
            <DataTable caption="درخواست‌های سفر" minWidth={960}>
              <thead>
                <tr>
                  <th>شمارهٔ درخواست</th>
                  <th>وضعیت</th>
                  <th>مرحله</th>
                  <th>نوع</th>
                  <th>زمان برنامه‌ریزی‌شده</th>
                  <th>مسافران</th>
                  <th>مبدأ / مقصد</th>
                  <th>هدف سفر</th>
                  <th>اقدام بعدی</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((request) => (
                  <tr key={request.tripRequestId}>
                    <td>
                      <Link
                        href={`/trips/${request.tripRequestId}`}
                        className={styles.recordLink}
                      >
                        <TechnicalValue>{request.requestNo}</TechnicalValue>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge label={request.statusLabel} tone="info" />
                    </td>
                    <td>{request.currentStageLabel}</td>
                    <td>{request.requestTypeName}</td>
                    <td>{formatTripDateTime(request.plannedAt)}</td>
                    <td>{request.passengerCount}</td>
                    <td>
                      {request.originSummary} ← {request.destinationSummary}
                    </td>
                    <td>{request.purpose ?? "ثبت نشده"}</td>
                    <td>
                      <span className={styles.muted}>
                        {request.nextActionHint}
                      </span>
                    </td>
                    <td>{requestLink(request.tripRequestId)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
          <RecordCardList>
            {rows.map((request) => (
              <RecordCard key={request.tripRequestId}>
                <RecordCardHeader
                  title={
                    <TechnicalValue>{request.requestNo}</TechnicalValue>
                  }
                  badge={
                    <StatusBadge label={request.statusLabel} tone="info" />
                  }
                />
                <RecordCardDetails>
                  <RecordCardDetail label="مرحله">
                    {request.currentStageLabel}
                  </RecordCardDetail>
                  <RecordCardDetail label="نوع">
                    {request.requestTypeName}
                  </RecordCardDetail>
                  <RecordCardDetail label="زمان برنامه‌ریزی‌شده">
                    {formatTripDateTime(request.plannedAt)}
                  </RecordCardDetail>
                  <RecordCardDetail label="مسافران">
                    {request.passengerCount}
                  </RecordCardDetail>
                  <RecordCardDetail label="مبدأ">
                    {request.originSummary}
                  </RecordCardDetail>
                  <RecordCardDetail label="مقصد">
                    {request.destinationSummary}
                  </RecordCardDetail>
                  <RecordCardDetail label="هدف سفر">
                    {request.purpose ?? "ثبت نشده"}
                  </RecordCardDetail>
                  <RecordCardDetail label="اقدام بعدی">
                    {request.nextActionHint}
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
