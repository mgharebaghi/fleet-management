import type { PersonSummary } from "./person-summary";

export type PersonSearchCriteria = {
  search: string | null;
  pageNumber: number;
  pageSize: number;
  isActive: boolean | null;
};

export type PersonSearchResult = {
  people: PersonSummary[];
  totalCount: number;
};
