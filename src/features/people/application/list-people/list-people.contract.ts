import type { PersonSearchResult } from "./person-search";

export type ListPeopleInput = {
  search?: string | null;
  pageNumber?: number;
  pageSize?: number;
  isActive?: boolean | null;
};

export type ListPeopleResult = PersonSearchResult;
