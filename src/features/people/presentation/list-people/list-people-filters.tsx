"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

import styles from "./list-people-page.module.css";

const SEARCH_DEBOUNCE_MS = 400;

export type ListPeopleStatus = "active" | "inactive" | "all";

type ListPeopleFiltersProps = {
  initialSearch: string;
  initialStatus: ListPeopleStatus;
  hasCriteria: boolean;
};

type SearchParamsSnapshot = Pick<URLSearchParams, "toString">;
type Navigate = (href: string) => void;
export type ListPeopleFilterState = {
  sourceSearch: string;
  sourceStatus: ListPeopleStatus;
  search: string;
  status: ListPeopleStatus;
};

export function synchronizeFilterState(
  filterState: ListPeopleFilterState,
  initialSearch: string,
  initialStatus: ListPeopleStatus,
): ListPeopleFilterState {
  if (
    filterState.sourceSearch === initialSearch &&
    filterState.sourceStatus === initialStatus
  ) {
    return filterState;
  }

  return {
    sourceSearch: initialSearch,
    sourceStatus: initialStatus,
    search: initialSearch,
    status: initialStatus,
  };
}

function buildFilterHref(
  pathname: string,
  searchParams: SearchParamsSnapshot,
  update:
    | { search: string }
    | { status: ListPeopleStatus; search: string },
): string {
  const params = new URLSearchParams(searchParams.toString());

  if ("status" in update) {
    params.set("status", update.status);
    if (update.search === "") {
      params.delete("search");
    } else {
      params.set("search", update.search);
    }
  } else if (update.search === "") {
    params.delete("search");
  } else {
    params.set("search", update.search);
  }

  params.delete("page");
  const query = params.toString();

  return query === "" ? pathname : `${pathname}?${query}`;
}

export function scheduleSearchNavigation({
  pathname,
  searchParams,
  search,
  navigate,
}: {
  pathname: string;
  searchParams: SearchParamsSnapshot;
  search: string;
  navigate: Navigate;
}): () => void {
  const timer = globalThis.setTimeout(() => {
    navigate(buildFilterHref(pathname, searchParams, { search }));
  }, SEARCH_DEBOUNCE_MS);

  return () => globalThis.clearTimeout(timer);
}

export function navigateToStatus({
  pathname,
  searchParams,
  status,
  search,
  navigate,
}: {
  pathname: string;
  searchParams: SearchParamsSnapshot;
  status: ListPeopleStatus;
  search: string;
  navigate: Navigate;
}): void {
  navigate(buildFilterHref(pathname, searchParams, { status, search }));
}

export function ListPeopleFilters({
  initialSearch,
  initialStatus,
  hasCriteria,
}: ListPeopleFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();
  const [filterState, setFilterState] = useState<ListPeopleFilterState>({
    sourceSearch: initialSearch,
    sourceStatus: initialStatus,
    search: initialSearch,
    status: initialStatus,
  });
  const cancelPendingSearch = useRef<(() => void) | null>(null);
  const synchronizedState = synchronizeFilterState(
    filterState,
    initialSearch,
    initialStatus,
  );
  const search = synchronizedState.search;
  const status = synchronizedState.status;

  if (synchronizedState !== filterState) {
    setFilterState(synchronizedState);
  }

  useEffect(() => {
    if (search === initialSearch) {
      return;
    }

    const cancel = scheduleSearchNavigation({
      pathname,
      searchParams: new URLSearchParams(currentQuery),
      search,
      navigate: (href) => router.replace(href, { scroll: false }),
    });
    cancelPendingSearch.current = cancel;

    return () => {
      cancel();
      if (cancelPendingSearch.current === cancel) {
        cancelPendingSearch.current = null;
      }
    };
  }, [currentQuery, initialSearch, pathname, router, search]);

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value as ListPeopleStatus;
    cancelPendingSearch.current?.();
    cancelPendingSearch.current = null;
    setFilterState((currentState) => ({
      ...currentState,
      status: nextStatus,
    }));
    navigateToStatus({
      pathname,
      searchParams: new URLSearchParams(currentQuery),
      status: nextStatus,
      search,
      navigate: (href) => router.replace(href, { scroll: false }),
    });
  }

  return (
    <div className={styles.filters}>
      <label className={styles.searchField}>
        <span>جستجوی اشخاص</span>
        <input
          type="search"
          name="search"
          value={search}
          onChange={(event) =>
            setFilterState((currentState) => ({
              ...currentState,
              search: event.target.value,
            }))
          }
          placeholder="نام، نام خانوادگی، شماره پرسنلی یا کد ملی"
        />
      </label>

      <label className={styles.statusField}>
        <span>وضعیت</span>
        <select name="status" value={status} onChange={handleStatusChange}>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
          <option value="all">همه</option>
        </select>
      </label>

      {hasCriteria && (
        <Link className={styles.clearLink} href="/people">
          پاک کردن
        </Link>
      )}
    </div>
  );
}
