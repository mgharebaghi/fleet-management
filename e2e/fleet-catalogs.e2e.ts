import { expect, test } from "@playwright/test";

import type { E2EDatabaseAdapter } from "./support/e2e-database";
import { connectToE2EDatabase } from "./support/e2e-database";
import { createUniqueToken } from "./support/person-fixtures";

test.describe.serial("Fleet Catalogs", () => {
  let e2eDatabaseAdapter: E2EDatabaseAdapter;

  test.beforeAll(async () => {
    e2eDatabaseAdapter = await connectToE2EDatabase();
  });

  test.afterEach(async () => {
    await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .query("DELETE FROM fleet.VehicleBrand WHERE BrandName LIKE 'E2E-%'");
  });

  test.afterAll(async () => {
    if (e2eDatabaseAdapter) {
      await e2eDatabaseAdapter.dispose();
    }
  });

  test("creates a vehicle brand from the create dialog and finds it in the view-all dialog", async ({
    page,
  }) => {
    const brandName = `E2E-${createUniqueToken()}`;

    await page.goto("/fleet/catalogs");
    const brandCard = page.getByRole("region", { name: "برند خودرو" });

    await brandCard.getByRole("button", { name: "+ افزودن" }).click();
    const createDialog = page.getByRole("dialog", {
      name: "افزودن برند خودرو",
    });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("نام برند").fill(brandName);
    await createDialog.getByRole("button", { name: "ثبت برند" }).click();

    await expect(createDialog).toBeHidden({ timeout: 10_000 });

    await brandCard.getByRole("button", { name: "مشاهده همه" }).click();
    const listDialog = page.getByRole("dialog", { name: "برند خودرو" });
    await expect(listDialog).toBeVisible();
    await expect(listDialog.getByText(brandName)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(listDialog).toBeHidden();

    const persistedBrands = await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .input("brandName", brandName)
      .query<{ BrandName: string; IsActive: boolean }>(
        "SELECT BrandName, IsActive FROM fleet.VehicleBrand WHERE BrandName = @brandName",
      );

    expect(persistedBrands.recordset).toHaveLength(1);
    expect(persistedBrands.recordset[0]).toMatchObject({
      BrandName: brandName,
      IsActive: true,
    });
  });

  test("rejects a duplicate vehicle brand name with a Persian error inside the create dialog", async ({
    page,
  }) => {
    const brandName = `E2E-${createUniqueToken()}`;

    await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .input("brandName", brandName)
      .query("INSERT INTO fleet.VehicleBrand (BrandName) VALUES (@brandName)");

    await page.goto("/fleet/catalogs");
    const brandCard = page.getByRole("region", { name: "برند خودرو" });

    await brandCard.getByRole("button", { name: "+ افزودن" }).click();
    const createDialog = page.getByRole("dialog", {
      name: "افزودن برند خودرو",
    });
    await createDialog.getByLabel("نام برند").fill(brandName);
    await createDialog.getByRole("button", { name: "ثبت برند" }).click();

    await expect(
      createDialog.getByText("این نام برند قبلاً ثبت شده است."),
    ).toBeVisible({ timeout: 10_000 });

    await expect(createDialog).toBeVisible();

    const persistedBrands = await e2eDatabaseAdapter
      .underlyingDriver()
      .request()
      .input("brandName", brandName)
      .query<{ BrandName: string }>(
        "SELECT BrandName FROM fleet.VehicleBrand WHERE BrandName = @brandName",
      );

    expect(persistedBrands.recordset).toHaveLength(1);
  });

  test("keeps a single scrollable region in a long view-all list and locks the background page", async ({
    page,
  }) => {
    const brandNames = Array.from(
      { length: 30 },
      () => `E2E-${createUniqueToken()}`,
    );

    const insertRequest = e2eDatabaseAdapter.underlyingDriver().request();
    const valuePlaceholders = brandNames.map((brandName, index) => {
      const parameterName = `brandName${index}`;
      insertRequest.input(parameterName, brandName);
      return `(@${parameterName})`;
    });
    await insertRequest.query(
      `INSERT INTO fleet.VehicleBrand (BrandName) VALUES ${valuePlaceholders.join(", ")}`,
    );

    // A short viewport forces the full list to exceed the dialog's max-height.
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto("/fleet/catalogs");

    const brandCard = page.getByRole("region", { name: "برند خودرو" });
    await brandCard.getByRole("button", { name: "مشاهده همه" }).click();
    const listDialog = page.getByRole("dialog", { name: "برند خودرو" });
    await expect(listDialog).toBeVisible();
    await expect(listDialog.getByText(brandNames[0])).toBeVisible();

    // Structural traversal: <dialog> > .panel(div) > .body(div); the header
    // is a <header>, so the panel's only div child is the scrollable body.
    const panel = listDialog.locator("> div").first();
    const body = panel.locator("> div").first();

    const measure = (locator: typeof listDialog) =>
      locator.evaluate((element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }));

    const dialogMetrics = await measure(listDialog);
    const panelMetrics = await measure(panel);
    const bodyMetrics = await measure(body);

    expect(dialogMetrics.scrollHeight).toBeLessThanOrEqual(
      dialogMetrics.clientHeight + 1,
    );
    expect(panelMetrics.scrollHeight).toBeLessThanOrEqual(
      panelMetrics.clientHeight + 1,
    );
    expect(bodyMetrics.scrollHeight).toBeGreaterThan(bodyMetrics.clientHeight);

    // Scrolling over the backdrop must not move the background page. The
    // baseline is taken with the dialog already open: clicking the trigger can
    // scroll it into view first, which says nothing about the backdrop.
    const scrollYWhileOpen = await page.evaluate(() => window.scrollY);
    await page.mouse.move(40, 400);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollYWhileOpen);

    await page.keyboard.press("Escape");
    await expect(listDialog).toBeHidden();
  });
});
