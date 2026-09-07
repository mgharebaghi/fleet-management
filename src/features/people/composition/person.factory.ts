import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreatePerson } from "../application/create-person/create-person";
import { DeletePerson } from "../application/delete-person/delete-person";
import { GetPerson } from "../application/get-person/get-person";
import { UpdatePerson } from "../application/update-person/update-person";
import { PrismaPersonRepository } from "../infrastructure/prisma/prisma-person-repository";

export function makeCreatePerson(): CreatePerson {
  const personRepository = new PrismaPersonRepository(prisma);

  return new CreatePerson(personRepository);
}

export function makeGetPerson(): GetPerson {
  const personRepository = new PrismaPersonRepository(prisma);

  return new GetPerson(personRepository);
}

export function makeUpdatePerson(): UpdatePerson {
  const personRepository = new PrismaPersonRepository(prisma);

  return new UpdatePerson(personRepository);
}

export function makeDeletePerson(): DeletePerson {
  const personRepository = new PrismaPersonRepository(prisma);

  return new DeletePerson(personRepository);
}
