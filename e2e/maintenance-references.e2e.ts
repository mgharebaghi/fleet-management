import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe.serial("Maintenance reference data", () => {
  const token = `E2E-M-${randomUUID().slice(0, 12)}`;
  const workshopName = `${token} تعمیرگاه`, typeName = `${token} سرویس دوره‌ای`;
  let adapter: E2EDatabaseAdapter, workshopId: number, technicianId: number;
  test.beforeAll(async () => { adapter = await connectToE2EDatabase(); });
  test.afterAll(async () => {
    test.setTimeout(60000);
    try { if (adapter) {
      const result = await adapter.underlyingDriver().request().input("token", token).query<{ remaining: number }>(`
        DELETE maintenance.Technician WHERE LastName=@token;
        DELETE maintenance.Workshop WHERE WorkshopName LIKE @token+'%';
        DELETE maintenance.MaintenanceType WHERE TypeCode LIKE @token+'%';
        SELECT (SELECT COUNT(*) FROM maintenance.Technician WHERE LastName=@token)+(SELECT COUNT(*) FROM maintenance.Workshop WHERE WorkshopName LIKE @token+'%')+(SELECT COUNT(*) FROM maintenance.MaintenanceType WHERE TypeCode LIKE @token+'%') remaining;
      `); expect(result.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });
  async function saveChanges(page: Page) {
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
  }
  test("creates, edits and deactivates a service type, preserves duplicate input and live error feedback", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/maintenance/catalogs/create");
    await captureResponsiveThemes(page, "maintenance-type-form");
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    const code = page.getByLabel("کد نوع تعمیر و سرویس", { exact: true });
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await code.fill(`${token}-type`); await expect(code).toHaveAttribute("aria-invalid", "false");
    await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(typeName);
    await expect(page.locator("#maintenance-type-form").getByRole("alert")).toHaveCount(0);
    await page.getByLabel("توضیحات", { exact: true }).fill("سرویس مطابق دستورالعمل خودرو");
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/);
    await page.getByRole("link", { name: "ویرایش نوع تعمیر و سرویس", exact: true }).click();
    await page.getByRole("checkbox", { name: "نوع تعمیر و سرویس فعال است", exact: true }).uncheck();
    await saveChanges(page); await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/);
    await expect(page.getByText("غیرفعال", { exact: true })).toBeVisible();
    await page.goto(`/maintenance/catalogs?active=all&search=${token}`);
    await captureResponsiveThemes(page, "maintenance-types-list");
    await expect(page.getByRole("row").filter({ hasText: token })).toContainText("غیرفعال");
    await page.getByRole("link", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await code.fill(`${token}-type`); await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill("ورودی تکراری");
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await expect(page.locator("#maintenance-type-form").getByRole("alert").last()).toContainText("قبلاً ثبت شده");
    await expect(page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true })).toHaveValue("ورودی تکراری");
  });
  test("creates a workshop with a free classification and shared balanced responsive form", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/maintenance/workshops/create");
    await captureResponsiveThemes(page, "workshop-form");
    await page.getByLabel("نام تعمیرگاه", { exact: true }).fill(workshopName);
    await page.getByLabel("نوع فعالیت تعمیرگاه", { exact: true }).fill("تعمیر تخصصی سامانه ترمز");
    await page.getByLabel("تلفن", { exact: true }).fill("۰۲۱۱۲۳۴۵۶۷۸");
    await page.getByLabel("نام مسئول تماس", { exact: true }).fill("مسئول تعمیرگاه");
    await page.getByRole("checkbox", { name: "تعمیرگاه داخلی سازمان است", exact: true }).check();
    await page.getByLabel("نشانی تعمیرگاه", { exact: true }).fill("تهران، خیابان آزمون");
    await page.getByRole("button", { name: "ثبت تعمیرگاه", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/workshops\/\d+$/);
    workshopId = Number(new URL(page.url()).pathname.split("/").at(-1));
    await expect(page.getByText("02112345678", { exact: true })).toBeVisible();
    await page.goto(`/maintenance/workshops?active=all&keep=1&page=9`);
    const search = page.getByLabel("جستجوی تعمیرگاه", { exact: true }); await search.fill(token);
    await expect(page).toHaveURL(/search=/); expect(new URL(page.url()).searchParams.get("keep")).toBe("1"); expect(new URL(page.url()).searchParams.get("page")).toBeNull();
    await expect(search).toBeFocused();
    await expect(page.getByRole("row").filter({ hasText: token })).toContainText("داخلی سازمان");
    await captureResponsiveThemes(page, "workshops-list");
  });
  test("links a technician, retains inactive workshop history and supports an independent technician", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/maintenance/technicians/create");
    await captureResponsiveThemes(page, "technician-form");
    await page.getByLabel("نام", { exact: true }).fill("علی");
    await page.getByLabel("نام خانوادگی", { exact: true }).fill(token);
    await page.getByLabel("شمارهٔ همراه", { exact: true }).fill("۰۹۱۲۱۲۳۴۵۶۷");
    await page.getByLabel("تخصص", { exact: true }).fill("تعمیر ترمز");
    await selectSearchableOption(page, "تعمیرگاه", token, workshopName);
    await page.getByRole("button", { name: "ثبت تعمیرکار", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/technicians\/\d+$/);
    technicianId = Number(new URL(page.url()).pathname.split("/").at(-1));
    await page.getByRole("link", { name: workshopName, exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: `علی ${token}` })).toBeVisible();
    await page.getByRole("link", { name: "ویرایش تعمیرگاه", exact: true }).click();
    await page.getByRole("checkbox", { name: "تعمیرگاه فعال است", exact: true }).uncheck(); await saveChanges(page);
    await expect(page).toHaveURL(new RegExp(`/maintenance/workshops/${workshopId}$`));
    await page.goto(`/maintenance/technicians/${technicianId}/edit`);
    await page.getByLabel("تخصص", { exact: true }).fill("تعمیر ترمز و تعلیق");
    await page.getByRole("checkbox", { name: "تعمیرکار فعال است", exact: true }).uncheck(); await saveChanges(page);
    await expect(page).toHaveURL(new RegExp(`/maintenance/technicians/${technicianId}$`));
    await expect(page.getByRole("link", { name: `${workshopName} (غیرفعال)`, exact: true })).toBeVisible();
    await page.goto(`/maintenance/technicians?active=all&search=${encodeURIComponent(`علی ${token}`)}`);
    await expect(page.getByRole("row").filter({ hasText: token })).toContainText("غیرفعال");
    await captureResponsiveThemes(page, "technicians-list");
    await page.goto("/maintenance/technicians/create");
    await page.getByLabel("نام", { exact: true }).fill("مستقل"); await page.getByLabel("نام خانوادگی", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ثبت تعمیرکار", exact: true }).click(); await expect(page).toHaveURL(/\/maintenance\/technicians\/\d+$/);
    await expect(page.getByText("مستقل از تعمیرگاه", { exact: true })).toBeVisible();
    const stored = await adapter.underlyingDriver().request().input("token", token).query<{ independent: number; inactive: number }>(`SELECT SUM(CASE WHEN WorkshopId IS NULL THEN 1 ELSE 0 END) independent,SUM(CASE WHEN IsActive=0 THEN 1 ELSE 0 END) inactive FROM maintenance.Technician WHERE LastName=@token`);
    expect(stored.recordset).toEqual([{ independent: 1, inactive: 1 }]);
  });
});
