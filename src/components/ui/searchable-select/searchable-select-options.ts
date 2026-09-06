import type { ReactNode } from "react";

export type SearchableSelectOption = {
  value: string;
  /** Plain-text accessible name; announced to screen readers and matched by search. */
  label: string;
  /** Combined haystack (e.g. brand + model + plate) the query is matched against. */
  searchText: string;
  disabled?: boolean;
  /** Rich visual row shown in the option list. */
  content: ReactNode;
  /** Compact content shown in the closed trigger once selected; falls back to `content`. */
  triggerContent?: ReactNode;
};

/**
 * Plain-substring match against each option's `searchText`. Callers supply
 * `normalizeQuery` (e.g. Persian/Arabic digit folding) so this stays
 * unaware of any domain-specific text rules.
 */
export function filterSearchableOptions<T extends SearchableSelectOption>(
  options: readonly T[],
  query: string,
  normalizeQuery: (value: string) => string = (value) => value,
): T[] {
  const normalizedQuery = normalizeQuery(query.trim());
  if (!normalizedQuery) {
    return [...options];
  }
  return options.filter((option) =>
    normalizeQuery(option.searchText).includes(normalizedQuery),
  );
}
