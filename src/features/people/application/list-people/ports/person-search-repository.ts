import type {
  PersonSearchCriteria,
  PersonSearchResult,
} from "../person-search";

export interface PersonSearchRepository {
  search(criteria: PersonSearchCriteria): Promise<PersonSearchResult>;
}
