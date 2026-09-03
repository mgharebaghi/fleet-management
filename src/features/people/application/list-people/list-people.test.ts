import { describe, expect, it } from "vitest";

import { ListPeople } from "./list-people";
import type {
  PersonSearchCriteria,
  PersonSearchResult,
} from "./person-search";
import type { PersonSearchRepository } from "./ports/person-search-repository";

const personSearchResult: PersonSearchResult = {
  people: [
    {
      personId: 42,
      personnelNo: "P-42",
      firstName: "Ali",
      lastName: "Ahmadi",
      nationalCode: "0012345679",
      isActive: true,
    },
  ],
  totalCount: 1,
};

class PersonSearchRepositoryFake implements PersonSearchRepository {
  readonly receivedCriteria: PersonSearchCriteria[] = [];

  async search(criteria: PersonSearchCriteria): Promise<PersonSearchResult> {
    this.receivedCriteria.push(criteria);
    return personSearchResult;
  }
}

const executeListPeople = async (
  input: Parameters<ListPeople["execute"]>[0] = {},
) => {
  const personSearchRepository = new PersonSearchRepositoryFake();
  const listPeople = new ListPeople(personSearchRepository);
  const result = await listPeople.execute(input);

  return { personSearchRepository, result };
};

describe("ListPeople", () => {
  it("uses the default page number, page size, and active filter", async () => {
    const { personSearchRepository } = await executeListPeople();

    expect(personSearchRepository.receivedCriteria).toEqual([
      {
        search: null,
        pageNumber: 1,
        pageSize: 20,
        isActive: true,
      },
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "uses page number 1 for invalid page number %s",
    async (pageNumber) => {
      const { personSearchRepository } = await executeListPeople({ pageNumber });

      expect(personSearchRepository.receivedCriteria[0].pageNumber).toBe(1);
    },
  );

  it("passes a valid page number to the repository", async () => {
    const { personSearchRepository } = await executeListPeople({
      pageNumber: 3,
    });

    expect(personSearchRepository.receivedCriteria[0].pageNumber).toBe(3);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "uses page size 20 for invalid page size %s",
    async (pageSize) => {
      const { personSearchRepository } = await executeListPeople({ pageSize });

      expect(personSearchRepository.receivedCriteria[0].pageSize).toBe(20);
    },
  );

  it("caps page size at 100", async () => {
    const { personSearchRepository } = await executeListPeople({
      pageSize: 101,
    });

    expect(personSearchRepository.receivedCriteria[0].pageSize).toBe(100);
  });

  it("passes page size 100 to the repository", async () => {
    const { personSearchRepository } = await executeListPeople({
      pageSize: 100,
    });

    expect(personSearchRepository.receivedCriteria[0].pageSize).toBe(100);
  });

  it.each([
    { isActive: undefined, expected: true },
    { isActive: true, expected: true },
    { isActive: false, expected: false },
    { isActive: null, expected: null },
  ])(
    "maps isActive $isActive to $expected",
    async ({ isActive, expected }) => {
      const { personSearchRepository } = await executeListPeople({ isActive });

      expect(personSearchRepository.receivedCriteria[0].isActive).toBe(expected);
    },
  );

  it("trims the search value", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "  Ali Ahmadi  ",
    });

    expect(personSearchRepository.receivedCriteria[0].search).toBe("Ali Ahmadi");
  });

  it("maps an empty trimmed search value to null", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "   ",
    });

    expect(personSearchRepository.receivedCriteria[0].search).toBeNull();
  });

  it("converts Arabic yeh and kaf to Persian characters", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "علي كريمي",
    });

    expect(personSearchRepository.receivedCriteria[0].search).toBe("علی کریمی");
  });

  it("converts Persian digits to Latin digits", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "۰۱۲۳۴۵۶۷۸۹",
    });

    expect(personSearchRepository.receivedCriteria[0].search).toBe("0123456789");
  });

  it("converts Arabic-Indic digits to Latin digits", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "٠١٢٣٤٥٦٧٨٩",
    });

    expect(personSearchRepository.receivedCriteria[0].search).toBe("0123456789");
  });

  it("does not apply additional search normalization", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "  ى أ إ آ  نیم‌ فاصله  ",
    });

    expect(personSearchRepository.receivedCriteria[0].search).toBe(
      "ى أ إ آ  نیم‌ فاصله",
    );
  });

  it("passes the exact normalized criteria to the repository", async () => {
    const { personSearchRepository } = await executeListPeople({
      search: "  كد ۱۲٣  ",
      pageNumber: 2,
      pageSize: 30,
      isActive: null,
    });

    expect(personSearchRepository.receivedCriteria).toEqual([
      {
        search: "کد 123",
        pageNumber: 2,
        pageSize: 30,
        isActive: null,
      },
    ]);
  });

  it("returns the Application repository result unchanged", async () => {
    const { result } = await executeListPeople();

    expect(result).toBe(personSearchResult);
  });
});
