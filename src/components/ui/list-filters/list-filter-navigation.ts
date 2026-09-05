/** Long enough to skip intermediate keystrokes, short enough to feel live. */
export const LIST_SEARCH_DEBOUNCE_MS = 400;

type SearchParamsSnapshot = Pick<URLSearchParams, "toString">;
type Navigate = (href: string) => void;

export type ListFilterValues = Readonly<Record<string, string>>;

/** The URL-derived values a listing was rendered from, plus the local draft. */
export type ListFilterDraft<TValues extends ListFilterValues> = {
  source: TValues;
  draft: TValues;
};

/**
 * Writes the given filter values into the current query string. An empty value
 * removes its parameter, unrelated parameters survive, and paging restarts
 * because the previous page number no longer describes the new result set.
 */
export function buildListFilterHref({
  pathname,
  searchParams,
  updates,
}: {
  pathname: string;
  searchParams: SearchParamsSnapshot;
  updates: ListFilterValues;
}): string {
  const params = new URLSearchParams(searchParams.toString());

  for (const [name, value] of Object.entries(updates)) {
    if (value === "") {
      params.delete(name);
    } else {
      params.set(name, value);
    }
  }

  params.delete("page");
  const query = params.toString();

  return query === "" ? pathname : `${pathname}?${query}`;
}

export function scheduleListFilterNavigation({
  pathname,
  searchParams,
  updates,
  navigate,
}: {
  pathname: string;
  searchParams: SearchParamsSnapshot;
  updates: ListFilterValues;
  navigate: Navigate;
}): () => void {
  const timer = globalThis.setTimeout(() => {
    navigate(buildListFilterHref({ pathname, searchParams, updates }));
  }, LIST_SEARCH_DEBOUNCE_MS);

  return () => globalThis.clearTimeout(timer);
}

/**
 * Keeps a local draft while the listing still reflects the values it was built
 * from, and adopts the new values once the URL changes from elsewhere.
 */
export function synchronizeListFilterDraft<TValues extends ListFilterValues>(
  state: ListFilterDraft<TValues>,
  source: TValues,
): ListFilterDraft<TValues> {
  const sourceNames = Object.keys(source);
  const isUnchanged =
    sourceNames.length === Object.keys(state.source).length &&
    sourceNames.every((name) => state.source[name] === source[name]);

  return isUnchanged ? state : { source, draft: source };
}
