import { expect, test } from "@playwright/test";

test("shows list clearing only for applied criteria and hides it again after clearing", async ({ page }) => {
  test.setTimeout(150000);
  for (const path of ["/inventory/stock", "/inventory/movements"]) {
    await page.goto(`${path}?page=2&keep=1`);
    const clear = page.getByRole("link", { name: "پاک کردن فیلترها", exact: true });
    await expect(clear).toHaveCount(0);
    await page.getByLabel("جستجوی موجودی و گردش", { exact: true }).fill("E2E-clear-filter-check");
    await expect(page).toHaveURL(/search=E2E-clear-filter-check/);
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(page).toHaveURL(new RegExp(`${path}\\?keep=1$`));
    await expect(clear).toHaveCount(0);
  }
  await page.getByLabel("نوع گردش", { exact: true }).selectOption("Issue");
  await expect(page).toHaveURL(/type=Issue/);
  await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).click();
  await expect(page.getByRole("link", { name: "پاک کردن فیلترها", exact: true })).toHaveCount(0);
  await page.goto("/people?status=active");
  await expect(page.getByRole("link", { name: /^پاک کردن/ })).toHaveCount(0);
  await page.getByLabel("جستجوی اشخاص", { exact: true }).fill("E2E-clear-filter-check");
  await expect(page).toHaveURL(/search=E2E-clear-filter-check/);
  await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).click();
  await expect(page.getByRole("link", { name: /^پاک کردن/ })).toHaveCount(0);
});
