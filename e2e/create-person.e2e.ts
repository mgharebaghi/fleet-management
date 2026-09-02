import { randomInt, randomUUID } from "node:crypto";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { expect, test } from "@playwright/test";

import { createMssqlConfigFromEnvironment } from "../src/infrastructure/database/prisma/mssql-config";

let e2eDatabaseAdapter: Awaited<ReturnType<PrismaMssql["connect"]>>;
const createdNationalCodes = new Set<string>();

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

test.describe.serial("Create Person", () => {
  test.beforeAll(async () => {
    const e2eMssqlConfig =
      createMssqlConfigFromEnvironment("E2E_DATABASE");
    e2eDatabaseAdapter = await new PrismaMssql(e2eMssqlConfig).connect();
    const databaseIdentity = await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .query<{ DatabaseName: string; PeopleTableId: number | null }>(
        "SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'person.People') AS PeopleTableId",
      );
    const [database] = databaseIdentity.recordset;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        "FleetManagementDB_E2ETest".toLowerCase() ||
      database.PeopleTableId === null
    ) {
      throw new Error("The configured E2E database identity is invalid.");
    }
  });

  test.afterEach(async () => {
    for (const nationalCode of createdNationalCodes) {
      await e2eDatabaseAdapter
        .underlyingDriver()
        .request()
        .input("nationalCode", nationalCode)
        .query(
          "DELETE FROM person.People WHERE NationalCode = @nationalCode",
        );
    }

    createdNationalCodes.clear();
  });

  test.afterAll(async () => {
    if (e2eDatabaseAdapter) {
      await e2eDatabaseAdapter.dispose();
    }
  });

  test("shows Persian validation errors beside required fields", async ({
    page,
  }) => {
    await page.goto("/people/create");
    await page.getByRole("button", { name: "ثبت شخص", exact: true }).click();

    await expect(
      page.getByText("وارد کردن این فیلد الزامی است.", { exact: true }),
    ).toHaveCount(2);
  });

  test("creates a person and persists the selected Jalali date as Gregorian", async ({
    page,
  }) => {
    const uniqueSuffix = randomUUID().replaceAll("-", "");
    const personnelNo = `E2E-${uniqueSuffix.slice(0, 12)}`;
    const nationalCode = createValidIranianNationalCode();
    const cardNo = uniqueSuffix.slice(0, 8);
    createdNationalCodes.add(nationalCode);

    await page.route("**/people/create", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      await route.continue();
    });

    await page.goto("/people/create");
    await page.getByLabel("نام", { exact: true }).fill(" علی ");
    await page.getByLabel("نام خانوادگی", { exact: true }).fill(" احمدی ");
    await page.getByLabel("شماره پرسنلی", { exact: true }).fill(personnelNo);
    await page.getByLabel("کد ملی", { exact: true }).fill(nationalCode);
    await page.getByLabel("شماره کارت", { exact: true }).fill(cardNo);
    await page.getByLabel("شماره موبایل", { exact: true }).fill("09120000000");
    await page.getByLabel("سال", { exact: true }).fill("۱۴۰۳");
    await page.locator("#jalali-month").selectOption("1");
    await page.locator("#jalali-day").selectOption("1");

    await expect(page.locator('input[name="employmentDate"]')).toHaveValue(
      "2024-03-20",
    );

    await page.getByRole("button", { name: "ثبت شخص", exact: true }).click();

    await expect(page.getByText("در حال ثبت اطلاعات…")).toBeVisible();
    await expect(
      page.getByText("اطلاعات شخص با موفقیت ثبت شد.", { exact: true }),
    ).toBeVisible();

    const persistedPeople = await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .input("nationalCode", nationalCode)
      .query<{
        PersonnelNo: string | null;
        FirstName: string;
        LastName: string;
        NationalCode: string | null;
        CardNo: string | null;
        Mobile: string | null;
        EmploymentDate: Date | null;
      }>(
        `SELECT PersonnelNo, FirstName, LastName, NationalCode, CardNo, Mobile, EmploymentDate
         FROM person.People
         WHERE NationalCode = @nationalCode`,
      );
    const [persistedPerson] = persistedPeople.recordset;

    expect(persistedPerson).toMatchObject({
      PersonnelNo: personnelNo,
      FirstName: "علی",
      LastName: "احمدی",
      NationalCode: nationalCode,
      CardNo: cardNo,
      Mobile: "09120000000",
    });
    expect(persistedPerson?.EmploymentDate?.toISOString().slice(0, 10)).toBe(
      "2024-03-20",
    );
  });
});
