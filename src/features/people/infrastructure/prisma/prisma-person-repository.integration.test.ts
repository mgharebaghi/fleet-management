import { randomInt, randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { config } from "dotenv";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import { PrismaClient } from "../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../infrastructure/database/prisma/mssql-config";

import type { NewPerson } from "../../application/person/person";
import { PrismaPersonRepository } from "./prisma-person-repository";

config({
  path: resolve(process.cwd(), ".env.test.local"),
  override: false,
  quiet: true,
});

const testMssqlConfig = createMssqlConfigFromEnvironment("TEST_DATABASE");
const configuredTestDatabaseName = testMssqlConfig.database;

if (
  !configuredTestDatabaseName.toLowerCase().includes("integrationtest")
) {
  throw new Error(
    "TEST_DATABASE_NAME must contain IntegrationTest.",
  );
}

if (
  process.env.DATABASE_SERVER?.toLowerCase() ===
    testMssqlConfig.server.toLowerCase() &&
  (process.env.DATABASE_PORT?.trim() || "1433") ===
    String(testMssqlConfig.port) &&
  process.env.DATABASE_NAME?.toLowerCase() ===
    configuredTestDatabaseName.toLowerCase()
) {
  throw new Error("Test and development databases must be different.");
}

const testPrismaClient = new PrismaClient({
  adapter: new PrismaMssql(testMssqlConfig),
});
const personRepository = new PrismaPersonRepository(testPrismaClient);
const createdPersonIds = new Set<number>();

function createValidIranianNationalCode(): string {
  let firstNineDigits = randomInt(0, 1_000_000_000)
    .toString()
    .padStart(9, "0");

  while (/^(\d)\1{8}$/.test(firstNineDigits)) {
    firstNineDigits = randomInt(0, 1_000_000_000)
      .toString()
      .padStart(9, "0");
  }

  const weightedSum = firstNineDigits
    .split("")
    .reduce(
      (sum, digit, index) => sum + Number(digit) * (10 - index),
      0,
    );
  const remainder = weightedSum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return `${firstNineDigits}${checkDigit}`;
}

function createNewPerson(): NewPerson {
  const uniqueId = randomUUID().replaceAll("-", "");

  return {
    personnelNo: `IT-${uniqueId}`,
    firstName: "Integration",
    lastName: "Test",
    nationalCode: createValidIranianNationalCode(),
    cardNo: uniqueId.slice(0, 8),
    mobile: null,
    employmentDate: new Date("2026-01-10T00:00:00.000Z"),
  };
}

describe.sequential("PrismaPersonRepository integration", () => {
  beforeAll(async () => {
    await testPrismaClient.$connect();

    const databaseIdentity = await testPrismaClient.$queryRaw<
      Array<{ DatabaseName: string; PeopleTableId: number | null }>
    >`SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'person.People') AS PeopleTableId`;
    const [database] = databaseIdentity;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        configuredTestDatabaseName.toLowerCase() ||
      database.PeopleTableId === null
    ) {
      throw new Error(
        "The configured integration test database identity is invalid.",
      );
    }
  });

  afterEach(async () => {
    for (const personId of createdPersonIds) {
      await testPrismaClient.people.deleteMany({ where: { PersonId: personId } });
    }

    createdPersonIds.clear();
  });

  afterAll(async () => {
    await testPrismaClient.$disconnect();
  });

  it("persists mapped person data and checks identifier existence", async () => {
    const newPerson = createNewPerson();

    await expect(
      personRepository.existsByNationalCode(newPerson.nationalCode!),
    ).resolves.toBe(false);
    await expect(
      personRepository.existsByPersonnelNo(newPerson.personnelNo!),
    ).resolves.toBe(false);
    await expect(
      personRepository.existsByCardNo(newPerson.cardNo!),
    ).resolves.toBe(false);

    const createdPerson = await personRepository.create(newPerson);
    createdPersonIds.add(createdPerson.personId);

    expect(createdPerson).toEqual({
      ...newPerson,
      personId: expect.any(Number),
      isActive: true,
      createdAt: expect.any(Date),
    });

    const persistedPerson = await testPrismaClient.people.findUnique({
      where: { PersonId: createdPerson.personId },
    });

    expect(persistedPerson).toMatchObject({
      PersonId: createdPerson.personId,
      PersonnelNo: newPerson.personnelNo,
      FirstName: newPerson.firstName,
      LastName: newPerson.lastName,
      NationalCode: newPerson.nationalCode,
      CardNo: newPerson.cardNo,
      Mobile: null,
      EmploymentDate: newPerson.employmentDate,
      IsActive: true,
    });
    expect(persistedPerson?.CreatedAt).toBeInstanceOf(Date);

    await expect(
      personRepository.existsByNationalCode(newPerson.nationalCode!),
    ).resolves.toBe(true);
    await expect(
      personRepository.existsByPersonnelNo(newPerson.personnelNo!),
    ).resolves.toBe(true);
    await expect(
      personRepository.existsByCardNo(newPerson.cardNo!),
    ).resolves.toBe(true);
  });

  it("preserves nullable fields when creating a person", async () => {
    const newPerson: NewPerson = {
      ...createNewPerson(),
      personnelNo: null,
      nationalCode: null,
      cardNo: null,
      mobile: null,
      employmentDate: null,
    };

    const createdPerson = await personRepository.create(newPerson);
    createdPersonIds.add(createdPerson.personId);

    expect(createdPerson).toEqual({
      ...newPerson,
      personId: expect.any(Number),
      isActive: true,
      createdAt: expect.any(Date),
    });
  });
});
