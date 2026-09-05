"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  buildListFilterHref,
  scheduleListFilterNavigation,
  synchronizeListFilterDraft,
  type ListFilterValues,
} from "./list-filter-navigation";

type UseListFiltersOptions<TValues extends ListFilterValues> = {
  /** Filter values derived from the URL the listing was rendered for. */
  values: TValues;
  /** The free-text filter whose navigation is debounced while typing. */
  searchName: keyof TValues & string;
};

type ListFiltersController<TValues extends ListFilterValues> = {
  values: TValues;
  changeSearch: (value: string) => void;
  applyFilter: (name: keyof TValues & string, value: string) => void;
};

/**
 * Drives a listing whose filters live in the URL: typing navigates after a
 * debounce, every other filter navigates at once, and both keep the values the
 * user has already typed. The input itself stays mounted, so focus survives.
 */
export function useListFilters<TValues extends ListFilterValues>({
  values,
  searchName,
}: UseListFiltersOptions<TValues>): ListFiltersController<TValues> {
  const router = useRouter();
  const pathname = usePathname();
  const currentQuery = useSearchParams().toString();
  const [draftState, setDraftState] = useState({
    source: values,
    draft: values,
  });
  const cancelPendingSearch = useRef<(() => void) | null>(null);

  const synchronized = synchronizeListFilterDraft(draftState, values);

  if (synchronized !== draftState) {
    setDraftState(synchronized);
  }

  const draft = synchronized.draft;
  const search = draft[searchName];
  const sourceSearch = values[searchName];

  useEffect(() => {
    if (search === sourceSearch) {
      return;
    }

    const cancel = scheduleListFilterNavigation({
      pathname,
      searchParams: new URLSearchParams(currentQuery),
      updates: { [searchName]: search },
      navigate: (href) => router.replace(href, { scroll: false }),
    });
    cancelPendingSearch.current = cancel;

    return () => {
      cancel();
      if (cancelPendingSearch.current === cancel) {
        cancelPendingSearch.current = null;
      }
    };
  }, [currentQuery, pathname, router, search, searchName, sourceSearch]);

  return {
    values: draft,
    changeSearch(value: string) {
      setDraftState((current) => ({
        ...current,
        draft: { ...current.draft, [searchName]: value },
      }));
    },
    applyFilter(name, value) {
      cancelPendingSearch.current?.();
      cancelPendingSearch.current = null;
      setDraftState((current) => ({
        ...current,
        draft: { ...current.draft, [name]: value },
      }));
      router.replace(
        buildListFilterHref({
          pathname,
          searchParams: new URLSearchParams(currentQuery),
          updates: { ...draft, [name]: value },
        }),
        { scroll: false },
      );
    },
  };
}
