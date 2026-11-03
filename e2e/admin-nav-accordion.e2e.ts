import { expect, test } from "@playwright/test";
for (const mobile of [false, true]) {
  test(`keeps one navigation group open and closes groups on leaf navigation (${mobile ? "mobile" : "desktop"})`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 720 });
    await page.goto("/inventory/stock");
    if (mobile) await page.getByRole("button", { name: "پیمایش", exact: true }).click();
    const nav = page.getByRole("navigation", { name: mobile ? "پیمایش اصلی (موبایل)" : "پیمایش اصلی", exact: true });
    await expect(nav.getByRole("button", { name: "قطعات و انبار", exact: true })).toHaveAttribute("aria-expanded", "true");
    await nav.getByRole("button", { name: "ناوگان", exact: true }).click();
    await expect(nav.getByRole("button", { name: "قطعات و انبار", exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(1);
    await nav.getByRole("button", { name: /^سفرها/ }).click();
    await expect(nav.getByRole("button", { name: "ناوگان", exact: true })).toHaveAttribute("aria-expanded", "false");
    await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(1);
    await nav.getByRole("link", { name: "رانندگان", exact: true }).click();
    await expect(page).toHaveURL(/\/drivers$/);
    if (mobile) await page.getByRole("button", { name: "پیمایش", exact: true }).click();
    await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(0);
    await nav.getByRole("button", { name: "تعمیرات و نگهداری", exact: true }).click();
    await nav.getByRole("link", { name: "تعمیرگاه‌ها", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/workshops$/);
    if (mobile) await page.getByRole("button", { name: "پیمایش", exact: true }).click();
    await expect(nav.getByRole("button", { name: "تعمیرات و نگهداری", exact: true })).toHaveAttribute("aria-expanded", "true");
    await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(1);
    await nav.getByRole("button", { name: "تعمیرات و نگهداری", exact: true }).press("Enter");
    await expect(nav.locator('button[aria-expanded="true"]')).toHaveCount(0);
  });
}
