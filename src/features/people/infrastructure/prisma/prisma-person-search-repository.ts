import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import type { PersonSearchRepository } from "../../application/list-people/ports/person-search-repository";
import type {
  PersonSearchCriteria,
  PersonSearchResult,
} from "../../application/list-people/person-search";
import type { PersonSummary } from "../../application/list-people/person-summary";

type PeopleSearchPrismaClient = Pick<PrismaClient, "people" | "$transaction">;

const personSummarySelect = {
  PersonId: true,
  PersonnelNo: true,
  FirstName: true,
  LastName: true,
  NationalCode: true,
  IsActive: true,
} satisfies Prisma.PeopleSelect;

type SelectedPerson = Prisma.PeopleGetPayload<{
  select: typeof personSummarySelect;
}>;

function buildWhere(criteria: PersonSearchCriteria): Prisma.PeopleWhereInput {
  return {
    ...(criteria.search === null
      ? {}
      : {
          // Every value the people list shows is searchable. Mobile is
          // deliberately excluded: it is not shown, and it is not free-text
          // searchable data.
          OR: [
            { FirstName: { contains: criteria.search } },
            { LastName: { contains: criteria.search } },
            { PersonnelNo: { contains: criteria.search } },
            { NationalCode: { contains: criteria.search } },
          ],
        }),
    ...(criteria.isActive === null
      ? {}
      : { IsActive: criteria.isActive }),
  };
}

function mapSelectedPersonToSummary(person: SelectedPerson): PersonSummary {
  return {
    personId: person.PersonId,
    personnelNo: person.PersonnelNo,
    firstName: person.FirstName,
    lastName: person.LastName,
    nationalCode: person.NationalCode,
    isActive: person.IsActive,
  };
}

export class PrismaPersonSearchRepository implements PersonSearchRepository {
  constructor(private readonly prismaClient: PeopleSearchPrismaClient) {}

  async search(criteria: PersonSearchCriteria): Promise<PersonSearchResult> {
    const where = buildWhere(criteria);
    const [people, totalCount] = await this.prismaClient.$transaction([
      this.prismaClient.people.findMany({
        where,
        select: personSummarySelect,
        orderBy: { PersonId: "desc" },
        skip: (criteria.pageNumber - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prismaClient.people.count({ where }),
    ]);

    return {
      people: people.map(mapSelectedPersonToSummary),
      totalCount,
    };
  }
}
