import {
  Prisma,
  type PrismaClient,
  type People as PrismaPeople,
} from "../../../../generated/prisma/client";

import type { NewPerson, Person } from "../../application/person";
import {
  PersonNotFoundError,
  PersonReferencedError,
  type PersonRepository,
  type UpdatePersonChanges,
} from "../../application/ports/person-repository";

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

  async existsByNationalCode(
    nationalCode: string,
    excludePersonId?: number,
  ): Promise<boolean> {
    const person = await this.prismaClient.people.findFirst({
      where: {
        NationalCode: nationalCode,
        ...(excludePersonId !== undefined
          ? { PersonId: { not: excludePersonId } }
          : {}),
      },
      select: { PersonId: true },
    });

    return person !== null;
  }

  async existsByPersonnelNo(
    personnelNo: string,
    excludePersonId?: number,
  ): Promise<boolean> {
    const person = await this.prismaClient.people.findFirst({
      where: {
        PersonnelNo: personnelNo,
        ...(excludePersonId !== undefined
          ? { PersonId: { not: excludePersonId } }
          : {}),
      },
      select: { PersonId: true },
    });

    return person !== null;
  }

  async existsByCardNo(
    cardNo: string,
    excludePersonId?: number,
  ): Promise<boolean> {
    const person = await this.prismaClient.people.findFirst({
      where: {
        CardNo: cardNo,
        ...(excludePersonId !== undefined
          ? { PersonId: { not: excludePersonId } }
          : {}),
      },
      select: { PersonId: true },
    });

    return person !== null;
  }

  async findById(personId: number): Promise<Person | null> {
    const person = await this.prismaClient.people.findUnique({
      where: { PersonId: personId },
    });

    return person === null ? null : mapPrismaPeopleToPerson(person);
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

  async update(personId: number, changes: UpdatePersonChanges): Promise<Person> {
    try {
      const updatedPerson = await this.prismaClient.people.update({
        where: { PersonId: personId },
        data: {
          PersonnelNo: changes.personnelNo,
          FirstName: changes.firstName,
          LastName: changes.lastName,
          NationalCode: changes.nationalCode,
          CardNo: changes.cardNo,
          Mobile: changes.mobile,
          EmploymentDate: changes.employmentDate,
          IsActive: changes.isActive,
        },
      });

      return mapPrismaPeopleToPerson(updatedPerson);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new PersonNotFoundError();
      }
      throw error;
    }
  }

  async remove(personId: number): Promise<void> {
    try {
      await this.prismaClient.people.delete({ where: { PersonId: personId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new PersonNotFoundError();
        }
        if (error.code === "P2003") {
          throw new PersonReferencedError();
        }
      }
      throw error;
    }
  }
}
