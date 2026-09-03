import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { ListPeople } from "../application/list-people/list-people";
import { PrismaPersonSearchRepository } from "../infrastructure/prisma/prisma-person-search-repository";

export function makeListPeople(): ListPeople {
  const personSearchRepository = new PrismaPersonSearchRepository(prisma);

  return new ListPeople(personSearchRepository);
}
