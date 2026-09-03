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

import type { PersonSearchCriteria } from "../../application/list-people/person-search";
import { PrismaPersonSearchRepository } from "./prisma-person-search-repository";

config({
  path: resolve(process.cwd(), ".env.test.local"),
  override: false,
  quiet: true,
});

const testMssqlConfig = createMssqlConfigFromEnvironment("TEST_DATABASE");
const configuredTestDatabaseName = testMssqlConfig.database;

if (!configuredTestDatabaseName.toLowerCase().includes("integrationtest")) {
  throw new Error("TEST_DATABASE_NAME must contain IntegrationTest.");
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
const personSearchRepository = new PrismaPersonSearchRepository(
  testPrismaClient,
);
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

function createUniqueText(): string {
  return randomUUID().replaceAll("-", "").slice(0, 12);
}

async function createTestPerson(
  overrides: Partial<{
    PersonnelNo: string | null;
    FirstName: string;
    LastName: string;
    NationalCode: string | null;
    IsActive: boolean;
  }> = {},
) {
  const uniqueText = createUniqueText();
  const person = await testPrismaClient.people.create({
    data: {
      PersonnelNo: `LP-${uniqueText}`,
      FirstName: `First-${uniqueText}`,
      LastName: `Last-${uniqueText}`,
      NationalCode: createValidIranianNationalCode(),
      CardNo: null,
      Mobile: null,
      EmploymentDate: null,
      ...overrides,
    },
  });

  createdPersonIds.add(person.PersonId);
  return person;
}

function createCriteria(
  overrides: Partial<PersonSearchCriteria> = {},
): PersonSearchCriteria {
  return {
    search: null,
    pageNumber: 1,
    pageSize: 20,
    isActive: null,
    ...overrides,
  };
}

async function cleanupCreatedPeople(): Promise<void> {
  for (const personId of createdPersonIds) {
    await testPrismaClient.people.deleteMany({ where: { PersonId: personId } });
  }

  createdPersonIds.clear();
}

describe.sequential("PrismaPersonSearchRepository integration", () => {
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

  afterEach(cleanupCreatedPeople);

  afterAll(async () => {
    await cleanupCreatedPeople();
    await testPrismaClient.$disconnect();
  });

  it("searches four supported fields with OR and contains behavior", async () => {
    const nationalCode = createValidIranianNationalCode();
    const search = nationalCode.slice(2, 8);
    const firstNameMatch = await createTestPerson({
      FirstName: `Before${search}After`,
      NationalCode: null,
    });
    const lastNameMatch = await createTestPerson({
      LastName: `Before${search}After`,
      NationalCode: null,
    });
    const personnelNoMatch = await createTestPerson({
      PersonnelNo: `Before${search}After`,
      NationalCode: null,
    });
    const nationalCodeMatch = await createTestPerson({ NationalCode: nationalCode });

    const result = await personSearchRepository.search(
      createCriteria({ search }),
    );

    expect(result.people.map((person) => person.personId)).toEqual([
      nationalCodeMatch.PersonId,
      personnelNoMatch.PersonId,
      lastNameMatch.PersonId,
      firstNameMatch.PersonId,
    ]);
    expect(result.totalCount).toBe(4);
  });

  it("applies true, false, and null active filters exactly", async () => {
    const search = createUniqueText();
    const activePerson = await createTestPerson({
      FirstName: `Active-${search}`,
      IsActive: true,
    });
    const inactivePerson = await createTestPerson({
      FirstName: `Inactive-${search}`,
      IsActive: false,
    });

    const activeResult = await personSearchRepository.search(
      createCriteria({ search, isActive: true }),
    );
    const inactiveResult = await personSearchRepository.search(
      createCriteria({ search, isActive: false }),
    );
    const unfilteredResult = await personSearchRepository.search(
      createCriteria({ search, isActive: null }),
    );

    expect(activeResult.people.map((person) => person.personId)).toEqual([
      activePerson.PersonId,
    ]);
    expect(inactiveResult.people.map((person) => person.personId)).toEqual([
      inactivePerson.PersonId,
    ]);
    expect(unfilteredResult.people.map((person) => person.personId)).toEqual([
      inactivePerson.PersonId,
      activePerson.PersonId,
    ]);
  });

  it("sorts, pages, counts before paging, and maps PersonSummary", async () => {
    const search = createUniqueText();
    const oldestPerson = await createTestPerson({
      PersonnelNo: `Old-${search}`,
      FirstName: `Shared-${search}`,
      LastName: "Oldest",
      NationalCode: null,
      IsActive: true,
    });
    const secondPerson = await createTestPerson({
      PersonnelNo: null,
      FirstName: `Shared-${search}`,
      LastName: "Second",
      NationalCode: createValidIranianNationalCode(),
      IsActive: false,
    });
    await createTestPerson({ FirstName: `Shared-${search}` });
    await createTestPerson({ FirstName: `Shared-${search}` });

    const result = await personSearchRepository.search(
      createCriteria({ search, pageNumber: 2, pageSize: 2 }),
    );

    expect(result.totalCount).toBe(4);
    expect(result.people).toEqual([
      {
        personId: secondPerson.PersonId,
        personnelNo: null,
        firstName: `Shared-${search}`,
        lastName: "Second",
        nationalCode: secondPerson.NationalCode,
        isActive: false,
      },
      {
        personId: oldestPerson.PersonId,
        personnelNo: `Old-${search}`,
        firstName: `Shared-${search}`,
        lastName: "Oldest",
        nationalCode: null,
        isActive: true,
      },
    ]);
  });

  it("returns an empty result when no person matches", async () => {
    const result = await personSearchRepository.search(
      createCriteria({ search: `Missing-${createUniqueText()}` }),
    );

    expect(result).toEqual({ people: [], totalCount: 0 });
  });
});
