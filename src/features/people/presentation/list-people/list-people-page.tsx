import { ActionLink } from "../../../../components/ui/action-link/action-link";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { PageHeader } from "../../../../components/ui/page-header/page-header";
import { PageShell } from "../../../../components/ui/page-shell/page-shell";
import { Pagination } from "../../../../components/ui/pagination/pagination";
import {
  RecordCard,
  RecordCardDetail,
  RecordCardDetails,
  RecordCardHeader,
  RecordCardList,
} from "../../../../components/ui/record-cards/record-cards";
import { ResultState } from "../../../../components/ui/result-state/result-state";
import { StatusBadge } from "../../../../components/ui/status-badge/status-badge";
import { TechnicalValue } from "../../../../components/ui/technical-value/technical-value";
import type { ListPeopleInput } from "../../application/list-people/list-people.contract";
import type { PersonSummary } from "../../application/list-people/person-summary";
import { makeListPeople } from "../../composition/list-people.factory";
import { ListPeopleFilters } from "./list-people-filters";
import styles from "./list-people-page.module.css";

const DEFAULT_PAGE_SIZE = 20;

type SearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

type ListPeoplePageProps = {
  searchParams: SearchParams;
};

type StatusParam = "active" | "inactive" | "all";

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): StatusParam | undefined {
  return value === "active" || value === "inactive" || value === "all"
    ? value
    : undefined;
}

function mapStatusToIsActive(
  status: StatusParam | undefined,
): boolean | null | undefined {
  if (status === "active") {
    return true;
  }

  if (status === "inactive") {
    return false;
  }

  if (status === "all") {
    return null;
  }

  return undefined;
}

function parsePageNumber(value: string | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

function getDisplayedPageNumber(pageNumber: number | undefined): number {
  return pageNumber !== undefined && Number.isInteger(pageNumber) && pageNumber > 0
    ? pageNumber
    : 1;
}

function buildPageHref(
  search: string | undefined,
  status: StatusParam | undefined,
  pageNumber: number,
): string {
  const params = new URLSearchParams();

  if (search !== undefined && search !== "") {
    params.set("search", search);
  }

  if (status !== undefined) {
    params.set("status", status);
  }

  params.set("page", String(pageNumber));

  return `/people?${params.toString()}`;
}

function CreatePersonLink() {
  return (
    <ActionLink href="/people/create" variant="primary">
      افزودن شخص
    </ActionLink>
  );
}

function PeopleTable({ people }: { people: PersonSummary[] }) {
  return (
    <DataTable caption="فهرست اشخاص">
      <thead>
        <tr>
          <th scope="col">نام و نام خانوادگی</th>
          <th scope="col">شماره پرسنلی</th>
          <th scope="col">کد ملی</th>
          <th scope="col">وضعیت</th>
        </tr>
      </thead>
      <tbody>
        {people.map((person) => (
          <tr key={person.personId}>
            <td className={styles.personName}>
              {person.firstName} {person.lastName}
            </td>
            <td>
              <TechnicalValue>{person.personnelNo ?? "—"}</TechnicalValue>
            </td>
            <td>
              <TechnicalValue>{person.nationalCode ?? "—"}</TechnicalValue>
            </td>
            <td>
              <StatusBadge
                label={person.isActive ? "فعال" : "غیرفعال"}
                tone={person.isActive ? "positive" : "negative"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

function PersonCards({ people }: { people: PersonSummary[] }) {
  return (
    <RecordCardList>
      {people.map((person) => (
        <RecordCard key={person.personId}>
          <RecordCardHeader
            title={`${person.firstName} ${person.lastName}`}
            badge={
              <StatusBadge
                label={person.isActive ? "فعال" : "غیرفعال"}
                tone={person.isActive ? "positive" : "negative"}
              />
            }
          />
          <RecordCardDetails>
            <RecordCardDetail label="شماره پرسنلی">
              <TechnicalValue>{person.personnelNo ?? "—"}</TechnicalValue>
            </RecordCardDetail>
            <RecordCardDetail label="کد ملی">
              <TechnicalValue>{person.nationalCode ?? "—"}</TechnicalValue>
            </RecordCardDetail>
          </RecordCardDetails>
        </RecordCard>
      ))}
    </RecordCardList>
  );
}

function EmptyState({ hasCriteria }: { hasCriteria: boolean }) {
  return (
    <ResultState
      title={
        hasCriteria
          ? "نتیجه‌ای مطابق جستجو یا فیلتر شما پیدا نشد"
          : "هنوز شخصی ثبت نشده است"
      }
      description={
        hasCriteria
          ? "عبارت جستجو یا وضعیت انتخاب‌شده را تغییر دهید."
          : "برای شروع، اطلاعات اولین شخص را در سامانه ثبت کنید."
      }
      action={
        hasCriteria ? (
          <ActionLink href="/people">پاک کردن جستجو و فیلتر</ActionLink>
        ) : (
          <CreatePersonLink />
        )
      }
    />
  );
}

function ErrorState() {
  return (
    <ResultState
      variant="error"
      title="دریافت فهرست اشخاص امکان‌پذیر نبود"
      description="لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید."
      action={<ActionLink href="/people">تلاش دوباره</ActionLink>}
    />
  );
}

export async function ListPeoplePage({ searchParams }: ListPeoplePageProps) {
  const search = getSingleValue(searchParams.search);
  const status = parseStatus(getSingleValue(searchParams.status));
  const pageNumber = parsePageNumber(getSingleValue(searchParams.page));
  const displayedPageNumber = getDisplayedPageNumber(pageNumber);
  const input: ListPeopleInput = {
    search,
    pageNumber,
    isActive: mapStatusToIsActive(status),
  };

  let result;

  try {
    result = await makeListPeople().execute(input);
  } catch {
    return (
      <PageShell>
        <PageHeader
          eyebrow="مدیریت اشخاص"
          title="فهرست اشخاص"
          action={<CreatePersonLink />}
        />
        <ErrorState />
      </PageShell>
    );
  }

  const totalPages = Math.ceil(result.totalCount / DEFAULT_PAGE_SIZE);
  const hasCriteria =
    (search !== undefined && search !== "") || status !== undefined;

  return (
    <PageShell>
      <PageHeader
        eyebrow="مدیریت اشخاص"
        title="فهرست اشخاص"
        description="اطلاعات اشخاص را مشاهده کنید یا با نام، شماره پرسنلی و کد ملی جستجو کنید."
        action={<CreatePersonLink />}
      />

      <ListPeopleFilters
        initialSearch={search ?? ""}
        initialStatus={status ?? "active"}
        hasCriteria={hasCriteria}
      />

      {result.people.length > 0 ? (
        <>
          <div className={styles.resultSummary} aria-live="polite">
            <span>
              {new Intl.NumberFormat("fa-IR").format(result.totalCount)} شخص
            </span>
          </div>
          <PeopleTable people={result.people} />
          <PersonCards people={result.people} />
        </>
      ) : (
        <EmptyState hasCriteria={hasCriteria || result.totalCount > 0} />
      )}

      <Pagination
        label="صفحه‌بندی اشخاص"
        currentPage={displayedPageNumber}
        totalPages={totalPages}
        buildHref={(page) => buildPageHref(search, status, page)}
      />
    </PageShell>
  );
}
