import { expect, test } from "@playwright/test";
const paths = ["/people", "/drivers", "/fleet/vehicles", "/fleet/vehicle-insurances", "/trips/requests", "/inventory/parts", "/inventory/warehouses", "/inventory/stock", "/inventory/movements", "/maintenance/requests", "/maintenance/catalogs", "/maintenance/workshops", "/maintenance/technicians"];
for (const path of paths) {
  test(`uses shared search and clearing at ${path}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${path}?keep=1`);
    const clear = page.getByRole("link", { name: "پاک کردن فیلترها", exact: true });
    await expect(clear).toHaveCount(0);
    const search = page.locator('input[type="search"]').first();
    await search.fill("E2E-shared-search-check");
    await expect(page).toHaveURL(/search=E2E-shared-search-check/);
    await expect(search).toBeFocused();
    await expect(clear).toBeVisible();
    // Clearing must cancel a draft search that has not finished its debounce.
    await search.fill("E2E-pending-draft");
    await clear.click();
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}\\?keep=1$`));
    await expect(clear).toHaveCount(0);
    await expect(search).toHaveValue("");
    await page.waitForTimeout(600);
    expect(new URL(page.url()).searchParams.has("search")).toBe(false);
  });
}
