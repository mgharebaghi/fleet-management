import { describe, expect, it } from "vitest";

import {
  PersonNotFoundError,
  PersonReferencedError,
  type PersonRepository,
  type UpdatePersonChanges,
} from "../ports/person-repository";
import type { NewPerson, Person } from "../person";
import { DeletePerson } from "./delete-person";

class PersonRepositoryFake implements PersonRepository {
  readonly removedIds: number[] = [];
  behavior: "ok" | "referenced" | "not_found" = "ok";

  async existsByNationalCode(): Promise<boolean> {
    return false;
  }

  async existsByPersonnelNo(): Promise<boolean> {
    return false;
  }

  async existsByCardNo(): Promise<boolean> {
    return false;
  }

  async findById(): Promise<Person | null> {
    return null;
  }

  async create(person: NewPerson): Promise<Person> {
    return {
      ...person,
      personId: 1,
      isActive: true,
      createdAt: new Date(),
    };
  }

  async update(personId: number, changes: UpdatePersonChanges): Promise<Person> {
    return { ...changes, personId, createdAt: new Date() };
  }

  async remove(personId: number): Promise<void> {
    this.removedIds.push(personId);
    if (this.behavior === "referenced") {
      throw new PersonReferencedError();
    }
    if (this.behavior === "not_found") {
      throw new PersonNotFoundError();
    }
  }
}

describe("DeletePerson", () => {
  it("removes the person through the repository", async () => {
    const repository = new PersonRepositoryFake();
    const deletePerson = new DeletePerson(repository);

    const result = await deletePerson.execute(7);

    expect(result).toEqual({ success: true });
    expect(repository.removedIds).toEqual([7]);
  });

  it("maps a foreign-key-referenced failure to a REFERENCED error instead of throwing", async () => {
    const repository = new PersonRepositoryFake();
    repository.behavior = "referenced";
    const deletePerson = new DeletePerson(repository);

    const result = await deletePerson.execute(7);

    expect(result).toEqual({ success: false, error: { type: "REFERENCED" } });
  });

  it("maps a missing person to a NOT_FOUND error instead of throwing", async () => {
    const repository = new PersonRepositoryFake();
    repository.behavior = "not_found";
    const deletePerson = new DeletePerson(repository);

    const result = await deletePerson.execute(7);

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
});
