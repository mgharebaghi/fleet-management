import type { PrismaClient } from "@/generated/prisma/client";
import type { People as PrismaPeople } from "@/generated/prisma/client";

import type { NewPerson, Person } from "../../application/person";
import type { PersonRepository } from "../../application/ports/person-repository";

type PeoplePrismaClient = Pick<PrismaClient, "people">;

function mapPrismaPeopleToPerson(prismaPeople: PrismaPeople): Person {
  return {
    personId: prismaPeople.PersonId,
    personnelNo: prismaPeople.PersonnelNo,
    firstName: prismaPeople.FirstName,
    lastName: prismaPeople.LastName,
    nationalCode: prismaPeople.NationalCode,
    cardNo: prismaPeople.CardNo,
    mobile: prismaPeople.Mobile,
    employmentDate: prismaPeople.EmploymentDate,
    isActive: prismaPeople.IsActive,
    createdAt: prismaPeople.CreatedAt,
  };
}

export class PrismaPersonRepository implements PersonRepository {
  constructor(private readonly prismaClient: PeoplePrismaClient) {}

  async existsByNationalCode(nationalCode: string): Promise<boolean> {
    const person = await this.prismaClient.people.findFirst({
      where: { NationalCode: nationalCode },
      select: { PersonId: true },
    });

    return person !== null;
  }

  async existsByPersonnelNo(personnelNo: string): Promise<boolean> {
    const person = await this.prismaClient.people.findFirst({
      where: { PersonnelNo: personnelNo },
      select: { PersonId: true },
    });

    return person !== null;
  }

  async existsByCardNo(cardNo: string): Promise<boolean> {
    const person = await this.prismaClient.people.findFirst({
      where: { CardNo: cardNo },
      select: { PersonId: true },
    });

    return person !== null;
  }

  async create(person: NewPerson): Promise<Person> {
    const createdPerson = await this.prismaClient.people.create({
      data: {
        PersonnelNo: person.personnelNo,
        FirstName: person.firstName,
        LastName: person.lastName,
        NationalCode: person.nationalCode,
        CardNo: person.cardNo,
        Mobile: person.mobile,
        EmploymentDate: person.employmentDate,
      },
    });

    return mapPrismaPeopleToPerson(createdPerson);
  }
}
