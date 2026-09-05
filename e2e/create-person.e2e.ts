import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import type { E2EDatabaseAdapter } from "./support/e2e-database";
import { connectToE2EDatabase } from "./support/e2e-database";
import { createValidIranianNationalCode } from "./support/person-fixtures";
import { selectJalaliDate } from "./support/jalali-calendar";

let e2eDatabaseAdapter: E2EDatabaseAdapter;
const createdNationalCodes = new Set<string>();

test.describe.serial("Create Person", () => {
  test.beforeAll(async () => {
    e2eDatabaseAdapter = await connectToE2EDatabase();
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
    await expect(page.getByAltText("نشان سامانه مدیریت ناوگان")).toBeVisible();
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
    // The date is only ever chosen from the calendar panel.
    await page
      .getByRole("button", { name: "تاریخ استخدام (شمسی)" })
      .click();
    const employmentCalendar = page.getByRole("dialog", {
      name: "انتخاب تاریخ استخدام (شمسی)",
    });
    await expect(employmentCalendar).toBeVisible();
    await selectJalaliDate(employmentCalendar, 1403, "فروردین", "۱");

    await expect(page.locator('input[name="employmentDate"]')).toHaveValue(
      "2024-03-20",
    );
    await expect(
      page.getByRole("button", { name: "تاریخ استخدام (شمسی)" }),
    ).toContainText("۱۴۰۳/۰۱/۰۱");

    await page.getByRole("button", { name: "ثبت شخص", exact: true }).click();

    await expect(page.getByText("در حال ثبت اطلاعات…")).toBeVisible();
    await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });

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
