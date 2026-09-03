import type { PersonSearchRepository } from "./ports/person-search-repository";
import type {
  ListPeopleInput,
  ListPeopleResult,
} from "./list-people.contract";
import type { PersonSearchCriteria } from "./person-search";

const DEFAULT_PAGE_NUMBER = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const normalizePositiveInteger = (
  value: number | undefined,
  defaultValue: number,
): number =>
  value !== undefined && Number.isInteger(value) && value > 0
    ? value
    : defaultValue;

const normalizeSearch = (search: string | null | undefined): string | null => {
  if (search === null || search === undefined) {
    return null;
  }

  const trimmedSearch = search.trim();
  if (trimmedSearch.length === 0) {
    return null;
  }

  return trimmedSearch
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) =>
      String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)),
    );
};

export class ListPeople {
  constructor(private readonly personSearchRepository: PersonSearchRepository) {}

  async execute(input: ListPeopleInput = {}): Promise<ListPeopleResult> {
    const pageSize = Math.min(
      normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const criteria: PersonSearchCriteria = {
      search: normalizeSearch(input.search),
      pageNumber: normalizePositiveInteger(
        input.pageNumber,
        DEFAULT_PAGE_NUMBER,
      ),
      pageSize,
      isActive: input.isActive === undefined ? true : input.isActive,
    };

    return this.personSearchRepository.search(criteria);
  }
}
