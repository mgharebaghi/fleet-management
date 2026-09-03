import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreatePerson } from "../application/create-person/create-person";
import { PrismaPersonRepository } from "../infrastructure/prisma/prisma-person-repository";

export function makeCreatePerson(): CreatePerson {
  const personRepository = new PrismaPersonRepository(prisma);

  return new CreatePerson(personRepository);
}
