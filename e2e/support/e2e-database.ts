import { PrismaMssql } from "@prisma/adapter-mssql";

import { createMssqlConfigFromEnvironment } from "../../src/infrastructure/database/prisma/mssql-config";

export type E2EDatabaseAdapter = Awaited<ReturnType<PrismaMssql["connect"]>>;

const EXPECTED_E2E_DATABASE_NAME = "FleetManagementDB_E2ETest";

export async function connectToE2EDatabase(): Promise<E2EDatabaseAdapter> {
  const e2eMssqlConfig = createMssqlConfigFromEnvironment("E2E_DATABASE");
  const adapter = await new PrismaMssql(e2eMssqlConfig).connect();

  const databaseIdentity = await adapter
    .underlyingDriver()
    .request()
    .query<{ DatabaseName: string; PeopleTableId: number | null }>(
      "SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'person.People') AS PeopleTableId",
    );
  const [database] = databaseIdentity.recordset;

  if (
    !database ||
    database.DatabaseName.toLowerCase() !==
      EXPECTED_E2E_DATABASE_NAME.toLowerCase() ||
    database.PeopleTableId === null
  ) {
    await adapter.dispose();
    throw new Error("The configured E2E database identity is invalid.");
  }

  return adapter;
}

export type PersonFixtureInput = {
  firstName: string;
  lastName: string;
  personnelNo: string;
  isActive: boolean;
};

export async function createPerson(
  adapter: E2EDatabaseAdapter,
  person: PersonFixtureInput,
): Promise<number> {
  const result = await adapter
    .underlyingDriver()
    .request()
    .input("firstName", person.firstName)
    .input("lastName", person.lastName)
    .input("personnelNo", person.personnelNo)
    .input("isActive", person.isActive)
    .query<{ PersonId: number }>(
      `INSERT INTO person.People (FirstName, LastName, PersonnelNo, IsActive)
       OUTPUT INSERTED.PersonId
       VALUES (@firstName, @lastName, @personnelNo, @isActive)`,
    );

  return result.recordset[0].PersonId;
}

export async function findPersonIdByPersonnelNo(
  adapter: E2EDatabaseAdapter,
  personnelNo: string,
): Promise<number | null> {
  const result = await adapter
    .underlyingDriver()
    .request()
    .input("personnelNo", personnelNo)
    .query<{ PersonId: number }>(
      "SELECT PersonId FROM person.People WHERE PersonnelNo = @personnelNo",
    );

  return result.recordset[0]?.PersonId ?? null;
}

export async function deletePeopleByIds(
  adapter: E2EDatabaseAdapter,
  personIds: number[],
): Promise<void> {
  if (personIds.length === 0) {
    return;
  }

  const request = adapter.underlyingDriver().request();
  const placeholders = personIds.map((personId, index) => {
    const parameterName = `personId${index}`;
    request.input(parameterName, personId);
    return `@${parameterName}`;
  });

  await request.query(
    `DELETE FROM person.People WHERE PersonId IN (${placeholders.join(", ")})`,
  );
}
