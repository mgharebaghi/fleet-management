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
    // Every search value this controller has navigated to and not yet seen
    // arrive. Several navigations can be in flight at once, so remembering only
    // the latest would let an earlier one arrive unrecognised and replace the
    // draft the user has already typed past.
    navigatedSearches: [] as readonly string[],
  });
  const cancelPendingSearch = useRef<(() => void) | null>(null);

  const arrivedNavigation = draftState.navigatedSearches.indexOf(
    values[searchName],
  );
  const synchronizedDraft = synchronizeListFilterDraft(
    draftState,
    values,
    arrivedNavigation === -1 ? [] : [searchName],
  );
  const synchronized =
    synchronizedDraft === draftState
      ? draftState
      : {
          ...synchronizedDraft,
          // Navigations older than the one that arrived can no longer describe
          // the listing, and values changed elsewhere discard all of them.
          navigatedSearches:
            arrivedNavigation === -1
              ? []
              : draftState.navigatedSearches.slice(arrivedNavigation + 1),
        };

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
      navigate: (href) => {
        setDraftState((current) => ({
          ...current,
          navigatedSearches: [...current.navigatedSearches, search],
        }));
        router.replace(href, { scroll: false });
      },
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
        navigatedSearches: [...current.navigatedSearches, draft[searchName]],
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
