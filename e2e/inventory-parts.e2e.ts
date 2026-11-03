import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe.serial("Inventory parts", () => {
  let adapter: E2EDatabaseAdapter;
  const token = `E2E-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  let unitId: number;
  let verified = false;
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase(); verified = true;
    const unit = await adapter.underlyingDriver().request().input("name", token).query<{ id: number }>("INSERT INTO inventory.Unit (UnitName) OUTPUT INSERTED.UnitId id VALUES (@name)"); unitId = unit.recordset[0].id;
    await adapter.underlyingDriver().request().input("name", token).query("INSERT INTO inventory.PartCategory (CategoryName) VALUES (@name)");
  });
  test.afterAll(async () => {
    try { if (verified) {
      const result = await adapter.underlyingDriver().request().input("token", token).query<{ remaining: number }>(`
        DELETE s FROM inventory.StockTransaction s JOIN inventory.Part p ON p.PartId=s.PartId WHERE p.PartCode=@token;
        DELETE FROM inventory.Part WHERE PartCode=@token;
        DELETE FROM inventory.Warehouse WHERE WarehouseCode=@token;
        DELETE FROM inventory.PartCategory WHERE CategoryName=@token;
        DELETE FROM inventory.Unit WHERE UnitName=@token;
        SELECT COUNT(*) remaining FROM inventory.Part WHERE PartCode=@token;
      `); expect(result.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });
  test("creates, edits and searches exact part data using shared selectors and responsive themes", async ({ page }) => {
    test.setTimeout(120000);
    await page.goto("/inventory/parts/create");
    await page.getByLabel("کد قطعه", { exact: true }).fill(token);
    await page.getByLabel("نام قطعه", { exact: true }).fill(`${token} Filter`);
    await page.getByLabel("شمارهٔ فنی", { exact: true }).fill(`${token}-PN`);
    await page.getByLabel("سازنده", { exact: true }).fill(`${token} Maker`);
    await selectSearchableOption(page, "واحد شمارش", token, token);
    await selectSearchableOption(page, "دسته‌بندی قطعه", token, token);
    await page.getByLabel("حداقل موجودی", { exact: true }).fill("9999999999999999.99");
    await page.getByRole("button", { name: "ثبت قطعه", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/parts\/\d+$/, { timeout: 30000 });
    await expect(page.getByText("9999999999999999.99", { exact: true })).toBeVisible();
    await expect(page.getByText("سازگاری با مدل خودرو ثبت نشده است.")).toBeVisible();
    await page.getByRole("link", { name: "ویرایش قطعه", exact: true }).click();
    await expect(page.getByLabel("حداقل موجودی", { exact: true })).toHaveValue("9999999999999999.99");
    await page.getByRole("checkbox", { name: "قطعه فعال است", exact: true }).uncheck();
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات قطعه", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/parts\/\d+$/, { timeout: 30000 });
    await page.goto(`/inventory/parts?active=all&search=${token}`);
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(1);
    const partRow = page.getByRole("row").filter({ hasText: token });
    await expect(partRow.getByRole("link", { name: `ویرایش ${token} Filter`, exact: true })).toBeVisible();
    await expect(partRow.getByRole("button", { name: `حذف ${token} Filter`, exact: true })).toBeVisible();
    await captureResponsiveThemes(page, "parts-list");
    const row = await adapter.underlyingDriver().request().input("code", token).query<{ minimum: string; IsActive: boolean }>("SELECT CONVERT(varchar(40),MinStock) minimum,IsActive FROM inventory.Part WHERE PartCode=@code");
    expect(row.recordset).toEqual([{ minimum: "9999999999999999.99", IsActive: false }]);
  });
  test("retains duplicate input and freezes the unit after stock use", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/inventory/parts/create");
    await page.getByLabel("کد قطعه", { exact: true }).fill(token);
    await page.getByLabel("نام قطعه", { exact: true }).fill("Duplicate attempt");
    await selectSearchableOption(page, "واحد شمارش", token, token);
    await page.getByRole("button", { name: "ثبت قطعه", exact: true }).click();
    await expect(page.getByText("این کد قطعه قبلاً ثبت شده است.")).toBeVisible();
    await expect(page.getByLabel("نام قطعه", { exact: true })).toHaveValue("Duplicate attempt");
    const result = await adapter.underlyingDriver().request().input("code", token).query<{ id: number }>(`
      DECLARE @warehouse int;
      INSERT INTO inventory.Warehouse (WarehouseCode,WarehouseName) VALUES (@code,@code);
      SET @warehouse=SCOPE_IDENTITY();
      INSERT INTO inventory.StockTransaction (WarehouseId,PartId,TransactionType,Quantity)
        SELECT @warehouse,PartId,N'Opening',1 FROM inventory.Part WHERE PartCode=@code;
      SELECT PartId id FROM inventory.Part WHERE PartCode=@code;
    `);
    await page.goto(`/inventory/parts/${result.recordset[0].id}/edit`);
    await expect(page.getByLabel("واحد شمارش", { exact: true })).toBeDisabled();
    await expect(page.locator('input[name="unitId"]')).toHaveValue(String(unitId));
    await expect(page.getByText("این قطعه استفاده شده است و واحد آن قابل تغییر نیست.")).toBeVisible();
    await page.goto(`/inventory/parts?active=all&search=${token}`);
    await page.getByRole("button", { name: `حذف ${token} Filter`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "حذف قطعه", exact: true });
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("این قطعه سابقه یا وابستگی دارد و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید.");
  });
  test("deletes an unused part after confirmation", async ({ page }) => {
    // Remove only this suite's synthetic movement so its own part becomes unused.
    await adapter.underlyingDriver().request().input("code", token).query("DELETE s FROM inventory.StockTransaction s JOIN inventory.Part p ON p.PartId=s.PartId WHERE p.PartCode=@code");
    await page.goto(`/inventory/parts?active=all&search=${token}`);
    await page.getByRole("button", { name: `حذف ${token} Filter`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "حذف قطعه", exact: true });
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(0);
    const stored = await adapter.underlyingDriver().request().input("code", token).query("SELECT PartId FROM inventory.Part WHERE PartCode=@code");
    expect(stored.recordset).toHaveLength(0);
  });
});
