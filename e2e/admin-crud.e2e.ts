import { expect, test } from "@playwright/test";

import type { E2EDatabaseAdapter } from "./support/e2e-database";
import {
  connectToE2EDatabase,
  createPerson,
  deletePeopleByIds,
} from "./support/e2e-database";
import { createUniqueToken } from "./support/person-fixtures";

async function createDriver(
  adapter: E2EDatabaseAdapter,
  personId: number,
): Promise<number> {
  const result = await adapter
    .underlyingDriver()
    .request()
    .input("personId", personId)
    .query<{ DriverId: number }>(
      `INSERT INTO driver.Driver (PersonId)
       OUTPUT INSERTED.DriverId
       VALUES (@personId)`,
    );

  return result.recordset[0].DriverId;
}

async function deleteDriversByIds(
  adapter: E2EDatabaseAdapter,
  driverIds: number[],
): Promise<void> {
  if (driverIds.length === 0) {
    return;
  }

  const request = adapter.underlyingDriver().request();
  const placeholders = driverIds.map((driverId, index) => {
    const parameterName = `driverId${index}`;
    request.input(parameterName, driverId);
    return `@${parameterName}`;
  });

  await request.query(
    `DELETE FROM driver.Driver WHERE DriverId IN (${placeholders.join(", ")})`,
  );
}

test.describe("Admin shell navigation", () => {
  test("moves between People, Fleet and Drivers sections and marks the active one", async ({
    page,
  }) => {
    await page.goto("/people");

    const sidebar = page.getByRole("navigation", { name: "پیمایش اصلی" });
    await expect(sidebar.getByRole("link", { name: "افراد" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await sidebar.getByRole("link", { name: "خودروها" }).click();
    await expect(page).toHaveURL(/\/fleet\/vehicles$/);
    await expect(
      sidebar.getByRole("link", { name: "خودروها" }),
    ).toHaveAttribute("aria-current", "page");

    await sidebar.getByRole("link", { name: "رانندگان" }).click();
    await expect(page).toHaveURL(/\/drivers$/);
    await expect(
      sidebar.getByRole("link", { name: "رانندگان" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("collapses into a mobile toggle that opens without horizontal overflow and closes after navigating", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/people");

    const toggle = page.getByRole("button", { name: "پیمایش" });
    await expect(toggle).toBeVisible();

    const mobilePanel = page.locator("#admin-mobile-nav-panel");
    await expect(mobilePanel).toBeHidden();

    await toggle.click();
    await expect(mobilePanel).toBeVisible();

    const drawerBox = await mobilePanel.boundingBox();
    expect(drawerBox).not.toBeNull();
    expect(drawerBox!.y).toBe(0);
    expect(drawerBox!.height).toBe(844);
    await expect(page.locator("html")).toHaveCSS("overflow", "hidden");

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);

    await page.keyboard.press("Escape");
    await expect(mobilePanel).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await mobilePanel.getByRole("link", { name: "رانندگان" }).click();
    await expect(page).toHaveURL(/\/drivers$/);
    await expect(mobilePanel).toBeHidden();
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
  });
});

test.describe.serial("Person detail, update and delete", () => {
  let e2eDatabaseAdapter: E2EDatabaseAdapter;
  const personIds: number[] = [];
  const driverIds: number[] = [];

  test.beforeAll(async () => {
    e2eDatabaseAdapter = await connectToE2EDatabase();
  });

  test.afterAll(async () => {
    await deleteDriversByIds(e2eDatabaseAdapter, driverIds);
    await deletePeopleByIds(e2eDatabaseAdapter, personIds);
    await e2eDatabaseAdapter.dispose();
  });

  test("opens a person's detail page from the list and edits it, with validation failure shown first", async ({
    page,
  }) => {
    const token = createUniqueToken();
    const personnelNo = `${token}-EDIT`;
    const personId = await createPerson(e2eDatabaseAdapter, {
      firstName: "قبل",
      lastName: token,
      personnelNo,
      isActive: true,
    });
    personIds.push(personId);

    await page.goto(`/people?search=${encodeURIComponent(personnelNo)}`);
    await page.getByRole("link", { name: "مشاهده پرونده" }).click();
    await expect(page).toHaveURL(new RegExp(`/people/${personId}$`));
    await expect(page.getByRole("heading", { name: `قبل ${token}` })).toBeVisible();

    await page.getByRole("link", { name: "ویرایش اطلاعات" }).click();
    await expect(page).toHaveURL(new RegExp(`/people/${personId}/edit$`));

    const firstNameField = page.getByLabel("نام", { exact: true });
    await firstNameField.fill("   ");
    await page
      .getByRole("button", { name: "ذخیره تغییرات", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "ذخیره تغییرات" })
      .getByRole("button", { name: "تأیید و ذخیره", exact: true })
      .click();
    await expect(
      page.getByText("وارد کردن این فیلد الزامی است."),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/people/${personId}/edit$`));

    await firstNameField.fill("بعد");
    await page
      .getByRole("button", { name: "ذخیره تغییرات", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "ذخیره تغییرات" })
      .getByRole("button", { name: "تأیید و ذخیره", exact: true })
      .click();

    await expect(page).toHaveURL(new RegExp(`/people/${personId}$`), {
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: `بعد ${token}` })).toBeVisible();
  });

  test("blocks deleting a person who has a driver record, with a Persian explanation, and allows deleting one who does not", async ({
    page,
  }) => {
    const token = createUniqueToken();

    const driverPersonnelNo = `${token}-DRIVER`;
    const driverPersonId = await createPerson(e2eDatabaseAdapter, {
      firstName: "راننده",
      lastName: token,
      personnelNo: driverPersonnelNo,
      isActive: true,
    });
    personIds.push(driverPersonId);
    driverIds.push(await createDriver(e2eDatabaseAdapter, driverPersonId));

    const plainPersonnelNo = `${token}-PLAIN`;
    const plainPersonId = await createPerson(e2eDatabaseAdapter, {
      firstName: "معمولی",
      lastName: token,
      personnelNo: plainPersonnelNo,
      isActive: true,
    });
    personIds.push(plainPersonId);

    await page.goto(`/people/${driverPersonId}`);
    await page.getByRole("button", { name: "حذف شخص" }).click();
    await page
      .getByRole("dialog", { name: "حذف شخص" })
      .getByRole("button", { name: "حذف شخص", exact: true })
      .click();
    await expect(
      page.getByText(
        "این شخص به پروندهٔ رانندگی متصل است و امکان حذف آن وجود ندارد.",
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/people/${driverPersonId}$`));

    await page.goto(`/people/${plainPersonId}`);
    await page.getByRole("button", { name: "حذف شخص" }).click();
    await page
      .getByRole("dialog", { name: "حذف شخص" })
      .getByRole("button", { name: "حذف شخص", exact: true })
      .click();
    await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });

    await page.goto(`/people/${plainPersonId}`);
    await expect(
      page.getByRole("heading", { name: "شخص پیدا نشد" }),
    ).toBeVisible();
    personIds.splice(personIds.indexOf(plainPersonId), 1);
  });
});
