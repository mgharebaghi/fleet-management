import { describe, expect, it } from "vitest";

import {
  PersonNotFoundError,
  type PersonRepository,
  type UpdatePersonChanges,
} from "../ports/person-repository";
import type { NewPerson, Person } from "../person";
import { UpdatePerson } from "./update-person";
import type { UpdatePersonInput } from "./update-person.contract";

const EXISTING_PERSON: Person = {
  personId: 1,
  personnelNo: "P-1",
  firstName: "Ali",
  lastName: "Ahmadi",
  nationalCode: "0012345679",
  cardNo: "C-1",
  mobile: "09120000000",
  employmentDate: null,
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

class PersonRepositoryFake implements PersonRepository {
  readonly people = new Map<number, Person>([[1, EXISTING_PERSON]]);
  readonly updateCalls: { id: number; changes: UpdatePersonChanges }[] = [];
  missingId: number | null = null;

  async existsByNationalCode(
    nationalCode: string,
    excludePersonId?: number,
  ): Promise<boolean> {
    for (const person of this.people.values()) {
      if (
        person.nationalCode === nationalCode &&
        person.personId !== excludePersonId
      ) {
        return true;
      }
    }
    return false;
  }

  async existsByPersonnelNo(
    personnelNo: string,
    excludePersonId?: number,
  ): Promise<boolean> {
    for (const person of this.people.values()) {
      if (
        person.personnelNo === personnelNo &&
        person.personId !== excludePersonId
      ) {
        return true;
      }
    }
    return false;
  }

  async existsByCardNo(
    cardNo: string,
    excludePersonId?: number,
  ): Promise<boolean> {
    for (const person of this.people.values()) {
      if (person.cardNo === cardNo && person.personId !== excludePersonId) {
        return true;
      }
    }
    return false;
  }

  async findById(personId: number): Promise<Person | null> {
    return this.people.get(personId) ?? null;
  }

  async create(person: NewPerson): Promise<Person> {
    const created: Person = {
      ...person,
      personId: this.people.size + 1,
      isActive: true,
      createdAt: new Date(),
    };
    this.people.set(created.personId, created);
    return created;
  }

  async update(
    personId: number,
    changes: UpdatePersonChanges,
  ): Promise<Person> {
    this.updateCalls.push({ id: personId, changes });
    if (personId === this.missingId) {
      throw new PersonNotFoundError();
    }
    const existing = this.people.get(personId)!;
    const updated: Person = { ...existing, ...changes };
    this.people.set(personId, updated);
    return updated;
  }

  async remove(): Promise<void> {}
}

function validInput(): UpdatePersonInput {
  return {
    personId: 1,
    personnelNo: "P-1",
    firstName: "Ali",
    lastName: "Ahmadi Renamed",
    nationalCode: "0012345679",
    cardNo: "C-1",
    mobile: "09120000000",
    employmentDate: null,
    isActive: false,
  };
}

describe("UpdatePerson", () => {
  it("updates the person once validation and uniqueness pass", async () => {
    const repository = new PersonRepositoryFake();
    const updatePerson = new UpdatePerson(repository);

    const result = await updatePerson.execute(validInput());

    expect(result).toEqual({
      success: true,
      person: expect.objectContaining({
        personId: 1,
        lastName: "Ahmadi Renamed",
        isActive: false,
      }),
    });
  });

  it("returns a validation error without writing when the first name is blank", async () => {
    const repository = new PersonRepositoryFake();
    const updatePerson = new UpdatePerson(repository);

    const result = await updatePerson.execute({
      ...validInput(),
      firstName: "   ",
    });

    expect(result).toEqual({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { firstName: ["REQUIRED"] },
      },
    });
    expect(repository.updateCalls).toEqual([]);
  });

  it("excludes the person's own id from the uniqueness checks, so keeping the same national code succeeds", async () => {
    const repository = new PersonRepositoryFake();
    const updatePerson = new UpdatePerson(repository);

    const result = await updatePerson.execute(validInput());

    expect(result.success).toBe(true);
  });

  it("rejects a national code already used by a different person", async () => {
    const repository = new PersonRepositoryFake();
    await repository.create({
      personnelNo: null,
      firstName: "Reza",
      lastName: "Karimi",
      nationalCode: "0499370899",
      cardNo: null,
      mobile: null,
      employmentDate: null,
    });
    const updatePerson = new UpdatePerson(repository);

    const result = await updatePerson.execute({
      ...validInput(),
      nationalCode: "0499370899",
    });

    expect(result).toEqual({
      success: false,
      error: { type: "NATIONAL_CODE_ALREADY_EXISTS" },
    });
  });

  it("maps a write against a since-deleted person to a not-found error", async () => {
    const repository = new PersonRepositoryFake();
    repository.missingId = 1;
    const updatePerson = new UpdatePerson(repository);

    const result = await updatePerson.execute(validInput());

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
