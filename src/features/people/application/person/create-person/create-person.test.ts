import { describe, expect, it } from "vitest";

import type { NewPerson, Person } from "../person";
import type { PersonRepository } from "../ports/person-repository";
import { CreatePerson } from "./create-person";
import type { CreatePersonInput } from "./create-person.contract";

const createPersonInput: CreatePersonInput = {
  personnelNo: "P-100",
  firstName: "Ali",
  lastName: "Ahmadi",
  nationalCode: "0012345679",
  cardNo: "C-100",
  mobile: "09120000000",
  employmentDate: new Date("2026-01-10T00:00:00.000Z"),
};

const createdPerson: Person = {
  ...createPersonInput,
  personId: 1,
  isActive: true,
  createdAt: new Date("2026-01-11T08:00:00.000Z"),
};

class PersonRepositoryFake implements PersonRepository {
  readonly existingNationalCodes = new Set<string>();
  readonly existingPersonnelNumbers = new Set<string>();
  readonly existingCardNumbers = new Set<string>();
  readonly checkedNationalCodes: string[] = [];
  readonly checkedPersonnelNumbers: string[] = [];
  readonly checkedCardNumbers: string[] = [];
  readonly receivedPeople: NewPerson[] = [];
  createError: unknown;

  async existsByNationalCode(nationalCode: string): Promise<boolean> {
    this.checkedNationalCodes.push(nationalCode);
    return this.existingNationalCodes.has(nationalCode);
  }

  async existsByPersonnelNo(personnelNo: string): Promise<boolean> {
    this.checkedPersonnelNumbers.push(personnelNo);
    return this.existingPersonnelNumbers.has(personnelNo);
  }

  async existsByCardNo(cardNo: string): Promise<boolean> {
    this.checkedCardNumbers.push(cardNo);
    return this.existingCardNumbers.has(cardNo);
  }

  async create(person: NewPerson): Promise<Person> {
    if (this.createError !== undefined) {
      throw this.createError;
    }

    this.receivedPeople.push(person);
    return createdPerson;
  }
}

describe("CreatePerson", () => {
  it("returns validation errors without calling the repository", async () => {
    const personRepository = new PersonRepositoryFake();
    const createPerson = new CreatePerson(personRepository);
    const invalidInput: CreatePersonInput = {
      ...createPersonInput,
      firstName: " ",
    };

    const createPersonResult = await createPerson.execute(invalidInput);

    expect(createPersonResult).toEqual({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { firstName: ["REQUIRED"] },
      },
    });
    expect(personRepository.checkedNationalCodes).toEqual([]);
    expect(personRepository.checkedPersonnelNumbers).toEqual([]);
    expect(personRepository.checkedCardNumbers).toEqual([]);
    expect(personRepository.receivedPeople).toEqual([]);
  });

  it("normalizes input and creates a person when identifiers are unique", async () => {
    const personRepository = new PersonRepositoryFake();
    const createPerson = new CreatePerson(personRepository);
    const inputWithWhitespace: CreatePersonInput = {
      personnelNo: " P-100 ",
      firstName: " Ali ",
      lastName: " Ahmadi ",
      nationalCode: " 0012345679 ",
      cardNo: " C-100 ",
      mobile: " 09120000000 ",
      employmentDate: createPersonInput.employmentDate,
    };

    const createPersonResult = await createPerson.execute(inputWithWhitespace);

    expect(createPersonResult).toEqual({
      success: true,
      person: createdPerson,
    });
    expect(personRepository.checkedNationalCodes).toEqual(["0012345679"]);
    expect(personRepository.checkedPersonnelNumbers).toEqual(["P-100"]);
    expect(personRepository.checkedCardNumbers).toEqual(["C-100"]);
    expect(personRepository.receivedPeople).toEqual([createPersonInput]);
  });

  it("returns a national code conflict without creating a person", async () => {
    const personRepository = new PersonRepositoryFake();
    personRepository.existingNationalCodes.add("0012345679");
    const createPerson = new CreatePerson(personRepository);

    const createPersonResult = await createPerson.execute(createPersonInput);

    expect(createPersonResult).toEqual({
      success: false,
      error: { type: "NATIONAL_CODE_ALREADY_EXISTS" },
    });
    expect(personRepository.checkedPersonnelNumbers).toEqual([]);
    expect(personRepository.checkedCardNumbers).toEqual([]);
    expect(personRepository.receivedPeople).toEqual([]);
  });

  it("returns a personnel number conflict without creating a person", async () => {
    const personRepository = new PersonRepositoryFake();
    personRepository.existingPersonnelNumbers.add("P-100");
    const createPerson = new CreatePerson(personRepository);

    const createPersonResult = await createPerson.execute(createPersonInput);

    expect(createPersonResult).toEqual({
      success: false,
      error: { type: "PERSONNEL_NO_ALREADY_EXISTS" },
    });
    expect(personRepository.checkedCardNumbers).toEqual([]);
    expect(personRepository.receivedPeople).toEqual([]);
  });

  it("returns a card number conflict without creating a person", async () => {
    const personRepository = new PersonRepositoryFake();
    personRepository.existingCardNumbers.add("C-100");
    const createPerson = new CreatePerson(personRepository);

    const createPersonResult = await createPerson.execute(createPersonInput);

    expect(createPersonResult).toEqual({
      success: false,
      error: { type: "CARD_NO_ALREADY_EXISTS" },
    });
    expect(personRepository.receivedPeople).toEqual([]);
  });

  it("does not check absent identifiers before creating a person", async () => {
    const personRepository = new PersonRepositoryFake();
    const createPerson = new CreatePerson(personRepository);
    const inputWithoutIdentifiers: CreatePersonInput = {
      ...createPersonInput,
      personnelNo: null,
      nationalCode: null,
      cardNo: null,
    };

    const createPersonResult = await createPerson.execute(
      inputWithoutIdentifiers,
    );

    expect(createPersonResult.success).toBe(true);
    expect(personRepository.checkedNationalCodes).toEqual([]);
    expect(personRepository.checkedPersonnelNumbers).toEqual([]);
    expect(personRepository.checkedCardNumbers).toEqual([]);
    expect(personRepository.receivedPeople).toEqual([inputWithoutIdentifiers]);
  });

  it("propagates an unexpected repository error", async () => {
    const personRepository = new PersonRepositoryFake();
    const repositoryError = new Error("Unexpected repository error");
    personRepository.createError = repositoryError;
    const createPerson = new CreatePerson(personRepository);

    await expect(createPerson.execute(createPersonInput)).rejects.toBe(
      repositoryError,
    );
  });
});
