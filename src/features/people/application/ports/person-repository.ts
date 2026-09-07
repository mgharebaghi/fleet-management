import type { NewPerson, Person } from "../person";

// A record can disappear or change between a check and the write that follows it.
export class PersonNotFoundError extends Error {
  constructor() {
    super("The person no longer exists.");
    this.name = "PersonNotFoundError";
  }
}

// Raised when a delete is rejected by a foreign key: a driver record (or
// other data) still references this person, so the database refuses to
// remove it.
export class PersonReferencedError extends Error {
  constructor() {
    super("The person is referenced by other records.");
    this.name = "PersonReferencedError";
  }
}

export type UpdatePersonChanges = NewPerson & { isActive: boolean };

export interface PersonRepository {
  existsByNationalCode(
    nationalCode: string,
    excludePersonId?: number,
  ): Promise<boolean>;
  existsByPersonnelNo(
    personnelNo: string,
    excludePersonId?: number,
  ): Promise<boolean>;
  existsByCardNo(cardNo: string, excludePersonId?: number): Promise<boolean>;
  findById(personId: number): Promise<Person | null>;
  create(person: NewPerson): Promise<Person>;
  update(personId: number, changes: UpdatePersonChanges): Promise<Person>;
  remove(personId: number): Promise<void>;
}
