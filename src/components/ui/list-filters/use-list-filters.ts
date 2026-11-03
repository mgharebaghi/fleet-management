"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  buildListFilterHref,
  scheduleListFilterNavigation,
  synchronizeListFilterDraft,
  type ListFilterValues,
  hasListFilterCriteria,
  buildClearListFiltersHref,
} from "./list-filter-navigation";

type UseListFiltersOptions<TValues extends ListFilterValues> = {
  /** Filter values derived from the URL the listing was rendered for. */
  values: TValues;
  defaults: TValues;
  /** The free-text filter whose navigation is debounced while typing. */
  searchName: keyof TValues & string;
};

type ListFiltersController<TValues extends ListFilterValues> = {
  clear: { visible: boolean; href: string; onNavigate: () => void };
  values: TValues;
  /** A filter navigation is in flight; the listing still shows its previous results. */
  isPending: boolean;
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
  defaults,
  searchName,
}: UseListFiltersOptions<TValues>): ListFiltersController<TValues> {
  const router = useRouter();
  const pathname = usePathname();
  const currentQuery = useSearchParams().toString();
  const [isPending, startTransition] = useTransition();
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
  const clearing = useRef(false);

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
    if (clearing.current) {
      if (hasListFilterCriteria(values, defaults)) return;
      clearing.current = false;
    }
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
        startTransition(() => {
          router.replace(href, { scroll: false });
        });
      },
    });
    cancelPendingSearch.current = cancel;

    return () => {
      cancel();
      if (cancelPendingSearch.current === cancel) {
        cancelPendingSearch.current = null;
      }
    };
  }, [currentQuery, pathname, router, search, searchName, sourceSearch, values, defaults]);

  return {
    clear: {
      visible: hasListFilterCriteria(values, defaults),
      href: buildClearListFiltersHref(pathname, new URLSearchParams(currentQuery), defaults),
      onNavigate() {
        cancelPendingSearch.current?.();
        cancelPendingSearch.current = null;
        clearing.current = true;
        setDraftState(current => ({ ...current, draft: defaults, navigatedSearches: [...current.navigatedSearches, defaults[searchName]] }));
      },
    },
    values: draft,
    isPending,
    changeSearch(value: string) {
      clearing.current = false;
      setDraftState((current) => ({
        ...current,
        draft: { ...current.draft, [searchName]: value },
      }));
    },
    applyFilter(name, value) {
      clearing.current = false;
      cancelPendingSearch.current?.();
      cancelPendingSearch.current = null;
      setDraftState((current) => ({
        ...current,
        draft: { ...current.draft, [name]: value },
        navigatedSearches: [...current.navigatedSearches, draft[searchName]],
      }));
      startTransition(() => {
        router.replace(
          buildListFilterHref({
            pathname,
            searchParams: new URLSearchParams(currentQuery),
            updates: { ...draft, [name]: value },
          }),
          { scroll: false },
        );
      });
    },
  };
}
