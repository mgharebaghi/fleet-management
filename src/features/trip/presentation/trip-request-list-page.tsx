import { ActionLink } from "@/components/ui/action-link/action-link";
import { PageHeader } from "@/components/ui/page-header/page-header";
import { PageShell } from "@/components/ui/page-shell/page-shell";
import { Pagination } from "@/components/ui/pagination/pagination";
import { ResultState } from "@/components/ui/result-state/result-state";
import { makeReadTrips } from "../composition/trip.factory";
import { singleSearchParam } from "./trip-format";
import { TripFilters } from "./trip-filters";
import styles from "./trip-list.module.css";
import { TripRequestListRow } from "./trip-request-list-row";
import { projectTripListItem } from "./workspace/trip-workspace-view";

const PAGE_SIZE = 20;

const numberFormatter = new Intl.NumberFormat("fa-IR");

type SearchParams = Record<string, string | string[] | undefined>;

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
  const rows = result.requests.map((request) => ({
    status: request.status,
    view: projectTripListItem(request),
  }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت سفر"
        title="سفرها"
        description="مدیریت و مشاهده درخواست‌های سفر ناوگان"
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
        <section className={styles.listPanel} aria-label="درخواست‌های سفر">
          <p className={styles.listSummary}>
            نمایش {numberFormatter.format(rows.length)} مورد از{" "}
            {numberFormatter.format(result.totalCount)} سفر
          </p>
          <div className={styles.list}>
            {rows.map((row) => (
              <TripRequestListRow
                key={row.view.tripRequestId}
                request={row.view}
                status={row.status}
              />
            ))}
          </div>
        </section>
      )}
      <Pagination
        label="صفحه‌های درخواست سفر"
        currentPage={page}
        totalPages={Math.ceil(result.totalCount / PAGE_SIZE)}
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
