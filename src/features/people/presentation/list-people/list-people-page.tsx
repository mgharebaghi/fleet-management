import Link from "next/link";

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

function PeopleTable({ people }: { people: PersonSummary[] }) {
  return (
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className={styles.visuallyHidden}>فهرست اشخاص</caption>
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
      </table>
    </div>
  );
}

function PersonCards({ people }: { people: PersonSummary[] }) {
  return (
    <ul className={styles.personCards}>
      {people.map((person) => (
        <li key={person.personId} className={styles.personCard}>
          <div className={styles.personCardHeader}>
            <p className={styles.personCardName}>
              {person.firstName} {person.lastName}
            </p>
            <StatusBadge
              label={person.isActive ? "فعال" : "غیرفعال"}
              tone={person.isActive ? "positive" : "negative"}
            />
          </div>
          <dl className={styles.personCardDetails}>
            <div>
              <dt>شماره پرسنلی</dt>
              <dd>
                <TechnicalValue>{person.personnelNo ?? "—"}</TechnicalValue>
              </dd>
            </div>
            <div>
              <dt>کد ملی</dt>
              <dd>
                <TechnicalValue>{person.nationalCode ?? "—"}</TechnicalValue>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ hasCriteria }: { hasCriteria: boolean }) {
  return (
    <div className={styles.emptyState}>
      <h2>
        {hasCriteria
          ? "نتیجه‌ای مطابق جستجو یا فیلتر شما پیدا نشد"
          : "هنوز شخصی ثبت نشده است"}
      </h2>
      <p>
        {hasCriteria
          ? "عبارت جستجو یا وضعیت انتخاب‌شده را تغییر دهید."
          : "برای شروع، اطلاعات اولین شخص را در سامانه ثبت کنید."}
      </p>
      {hasCriteria ? (
        <Link className={styles.secondaryLink} href="/people">
          پاک کردن جستجو و فیلتر
        </Link>
      ) : (
        <Link className={styles.primaryLink} href="/people/create">
          افزودن شخص
        </Link>
      )}
    </div>
  );
}

function ErrorState() {
  return (
    <div className={styles.errorState} role="alert">
      <h2>دریافت فهرست اشخاص امکان‌پذیر نبود</h2>
      <p>لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.</p>
      <Link className={styles.secondaryLink} href="/people">
        تلاش دوباره
      </Link>
    </div>
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
      <main className={styles.page} lang="fa" dir="rtl">
        <section className={styles.card}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>مدیریت اشخاص</p>
              <h1>فهرست اشخاص</h1>
            </div>
            <Link className={styles.primaryLink} href="/people/create">
              افزودن شخص
            </Link>
          </header>
          <ErrorState />
        </section>
      </main>
    );
  }

  const totalPages = Math.ceil(result.totalCount / DEFAULT_PAGE_SIZE);
  const hasCriteria =
    (search !== undefined && search !== "") || status !== undefined;

  return (
    <main className={styles.page} lang="fa" dir="rtl">
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>مدیریت اشخاص</p>
            <h1>فهرست اشخاص</h1>
            <p className={styles.description}>
              اطلاعات اشخاص را مشاهده کنید یا با نام، شماره پرسنلی و کد ملی
              جستجو کنید.
            </p>
          </div>
          <Link className={styles.primaryLink} href="/people/create">
            افزودن شخص
          </Link>
        </header>

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

        {totalPages > 1 && (
          <nav className={styles.pagination} aria-label="صفحه‌بندی اشخاص">
            {displayedPageNumber > 1 ? (
              <Link
                className={styles.pageLink}
                href={buildPageHref(search, status, displayedPageNumber - 1)}
                rel="prev"
              >
                صفحه قبل
              </Link>
            ) : (
              <span className={styles.disabledPageLink}>صفحه قبل</span>
            )}

            <span className={styles.pageIndicator} aria-current="page">
              صفحه {new Intl.NumberFormat("fa-IR").format(displayedPageNumber)} از{" "}
              {new Intl.NumberFormat("fa-IR").format(totalPages)}
            </span>

            {displayedPageNumber < totalPages ? (
              <Link
                className={styles.pageLink}
                href={buildPageHref(search, status, displayedPageNumber + 1)}
                rel="next"
              >
                صفحه بعد
              </Link>
            ) : (
              <span className={styles.disabledPageLink}>صفحه بعد</span>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
