import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe.serial("Inventory reference data", () => {
  let adapter: E2EDatabaseAdapter;
  const token = `E2E-${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const unitName = `${token}-unit`;
  const categoryName = `${token}-category`;
  const warehouseCode = `${token}-warehouse`;
  let verified = false;

  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    const result = await adapter.underlyingDriver().request().query<{ unitTable: number | null; categoryTable: number | null; warehouseTable: number | null }>(`
      SELECT OBJECT_ID(N'inventory.Unit') unitTable,
        OBJECT_ID(N'inventory.PartCategory') categoryTable,
        OBJECT_ID(N'inventory.Warehouse') warehouseTable
    `);
    const row = result.recordset[0];
    if (!row?.unitTable || !row.categoryTable || !row.warehouseTable) throw new Error("Inventory E2E contract is missing.");
    verified = true;
  });

  test.afterAll(async () => {
    try { if (adapter && verified) {
      // Remove only this suite's uniquely named fixtures, in FK order.
      const cleanup = await adapter.underlyingDriver().request().input("token", `${token}%`).query<{ remaining: number }>(`
        DELETE FROM inventory.Part WHERE PartCode LIKE @token;
        DELETE FROM inventory.Warehouse WHERE WarehouseCode LIKE @token;
        DELETE FROM inventory.PartCategory WHERE CategoryName LIKE @token;
        DELETE FROM inventory.Unit WHERE UnitName LIKE @token;
        SELECT
          (SELECT COUNT(*) FROM inventory.Part WHERE PartCode LIKE @token) +
          (SELECT COUNT(*) FROM inventory.Warehouse WHERE WarehouseCode LIKE @token) +
          (SELECT COUNT(*) FROM inventory.PartCategory WHERE CategoryName LIKE @token) +
          (SELECT COUNT(*) FROM inventory.Unit WHERE UnitName LIKE @token) AS remaining;
      `);
      expect(cleanup.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });

  test("creates and updates a unit, retains duplicate input and deletes an unused unit", async ({ page }) => {
    await page.goto("/inventory/catalogs");
    const card = page.getByRole("region", { name: "واحدهای شمارش", exact: true });
    await card.getByRole("button", { name: "+ افزودن", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "افزودن واحد شمارش", exact: true });
    await dialog.getByLabel("نام واحد", { exact: true }).fill(unitName);
    await dialog.getByLabel("نماد واحد").fill("pc");
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await dialog.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(dialog).toBeHidden();

    await card.getByRole("button", { name: "+ افزودن", exact: true }).click();
    dialog = page.getByRole("dialog", { name: "افزودن واحد شمارش", exact: true });
    await dialog.getByLabel("نام واحد", { exact: true }).fill(unitName);
    await dialog.getByLabel("نماد واحد").fill("keep-me");
    await dialog.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(dialog.getByText("این نام قبلاً ثبت شده است.")).toBeVisible();
    await expect(dialog.getByLabel("نام واحد", { exact: true })).toHaveValue(unitName);
    await expect(dialog.getByLabel("نماد واحد")).toHaveValue("keep-me");
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();

    await card.getByRole("button", { name: "مشاهده همه", exact: true }).click();
    const list = page.getByRole("dialog", { name: "واحدهای شمارش", exact: true });
    await expect(list.getByText("نماد: pc", { exact: true })).toBeVisible();
    await list.screenshot({ path: test.info().outputPath("units-list.png") });
    await list.getByRole("button", { name: `ویرایش ${unitName}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "ویرایش واحد شمارش", exact: true });
    await expect(dialog.getByLabel("نماد واحد")).toHaveValue("pc");
    await dialog.getByLabel("نماد واحد").fill("piece");
    await dialog.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(dialog).toBeHidden();

    const stored = await adapter.underlyingDriver().request().input("name", unitName).query<{ Symbol: string }>("SELECT Symbol FROM inventory.Unit WHERE UnitName=@name");
    expect(stored.recordset).toEqual([{ Symbol: "piece" }]);
    await card.getByRole("button", { name: "مشاهده همه", exact: true }).click();
    await list.getByRole("button", { name: `حذف ${unitName}`, exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "حذف واحد شمارش", exact: true });
    await confirmation.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(confirmation).toBeHidden();
    const gone = await adapter.underlyingDriver().request().input("name", unitName).query("SELECT UnitId FROM inventory.Unit WHERE UnitName=@name");
    expect(gone.recordset).toHaveLength(0);
  });

  test("blocks deletion of a unit used by a part with a clear Persian message", async ({ page }) => {
    const usedName = `${token}-used`;
    const created = await adapter.underlyingDriver().request().input("name", usedName).query<{ UnitId: number }>("INSERT INTO inventory.Unit (UnitName) OUTPUT INSERTED.UnitId VALUES (@name)");
    await adapter.underlyingDriver().request().input("code", `${token}-part`).input("name", `${token}-part`).input("unit", created.recordset[0].UnitId).query("INSERT INTO inventory.Part (PartCode,PartName,UnitId) VALUES (@code,@name,@unit)");
    await page.goto("/inventory/catalogs");
    await page.getByRole("region", { name: "واحدهای شمارش", exact: true }).getByRole("button", { name: "مشاهده همه", exact: true }).click();
    await page.getByRole("dialog", { name: "واحدهای شمارش", exact: true }).getByRole("button", { name: `حذف ${usedName}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "حذف واحد شمارش", exact: true });
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("این واحد برای قطعات استفاده شده است و قابل حذف نیست.");
  });

  test("creates, deactivates and safely deletes a category using the shared row pattern", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/inventory/catalogs");
    const card = page.getByRole("region", { name: "دسته‌بندی قطعات", exact: true });
    await card.getByRole("button", { name: "+ افزودن", exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "افزودن دسته‌بندی قطعات", exact: true });
    await dialog.getByLabel("نام دسته‌بندی", { exact: true }).fill(categoryName);
    await dialog.getByRole("button", { name: "ثبت", exact: true }).click();
    await expect(dialog).toBeHidden();
    await captureResponsiveThemes(page, "inventory-catalogs");

    await card.getByRole("button", { name: "مشاهده همه", exact: true }).click();
    const list = page.getByRole("dialog", { name: "دسته‌بندی قطعات", exact: true });
    await expect(list.getByRole("button", { name: `حذف ${categoryName}`, exact: true })).toBeVisible();
    const rowBounds = await list.getByRole("listitem").filter({ hasText: categoryName }).boundingBox();
    const deleteBounds = await list.getByRole("button", { name: `حذف ${categoryName}`, exact: true }).boundingBox();
    expect(rowBounds && deleteBounds && deleteBounds.x - rowBounds.x).toBeLessThan(24);
    await list.screenshot({ path: test.info().outputPath("categories-list.png") });
    await list.getByRole("button", { name: `ویرایش ${categoryName}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "ویرایش دسته‌بندی قطعات", exact: true });
    await dialog.getByRole("checkbox", { name: "فعال", exact: true }).uncheck();
    await dialog.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(dialog).toBeHidden();
    await card.getByRole("button", { name: "مشاهده همه", exact: true }).click();
    await expect(list.getByRole("listitem").filter({ hasText: categoryName }).getByText("غیرفعال", { exact: true })).toBeVisible();
    const stored = await adapter.underlyingDriver().request().input("name", categoryName).query<{ IsActive: boolean }>("SELECT IsActive FROM inventory.PartCategory WHERE CategoryName=@name");
    expect(stored.recordset).toEqual([{ IsActive: false }]);
    await adapter.underlyingDriver().request().input("part", `${token}-part`).input("category", categoryName).query("UPDATE inventory.Part SET PartCategoryId=(SELECT PartCategoryId FROM inventory.PartCategory WHERE CategoryName=@category) WHERE PartCode=@part");
    await list.getByRole("button", { name: `حذف ${categoryName}`, exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "حذف دسته‌بندی قطعات", exact: true });
    await confirmation.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(confirmation.getByRole("alert")).toHaveText("این دسته‌بندی برای قطعات استفاده شده است و قابل حذف نیست. در صورت نیاز آن را غیرفعال کنید.");
    await confirmation.getByRole("button", { name: "انصراف", exact: true }).click();
    await adapter.underlyingDriver().request().input("part", `${token}-part`).query("UPDATE inventory.Part SET PartCategoryId=NULL WHERE PartCode=@part");
    await card.getByRole("button", { name: "مشاهده همه", exact: true }).click();
    await list.getByRole("button", { name: `حذف ${categoryName}`, exact: true }).click();
    await confirmation.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(confirmation).toBeHidden();
  });

  test("creates, reads, edits and searches a warehouse in RTL and both responsive themes", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/inventory/warehouses/create");
    await captureResponsiveThemes(page, "warehouse-create");
    const codeBounds = await page.getByLabel("کد انبار", { exact: true }).boundingBox();
    const nameBounds = await page.getByLabel("نام انبار", { exact: true }).boundingBox();
    const addressBounds = await page.getByLabel("نشانی یا محل انبار", { exact: true }).boundingBox();
    expect(codeBounds && nameBounds && Math.abs(codeBounds.width - nameBounds.width)).toBeLessThan(2);
    expect(addressBounds && codeBounds && addressBounds.width).toBeGreaterThan(codeBounds!.width * 1.9);
    await page.getByLabel("کد انبار", { exact: true }).fill(warehouseCode);
    await page.getByLabel("نام انبار", { exact: true }).fill(`${token} store`);
    await page.getByLabel("نشانی یا محل انبار", { exact: true }).fill(`${token} place`);
    await page.getByRole("button", { name: "انتخاب نشانی از نقشه", exact: true }).click();
    const addressDialog = page.getByRole("dialog", { name: "انتخاب نشانی از نقشه", exact: true });
    await expect(addressDialog.getByText("نقشه در دسترس نیست؛ نشانی را در فرم دستی وارد کنید.")).toBeVisible();
    await expect(addressDialog.getByRole("button", { name: "استفاده از این نشانی", exact: true })).toBeDisabled();
    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("warehouse-address-map-mobile.png"), fullPage: true });
    if (originalViewport) await page.setViewportSize(originalViewport);
    await page.keyboard.press("Escape");
    await expect(addressDialog).toBeHidden();
    await expect(page.getByLabel("نشانی یا محل انبار", { exact: true })).toHaveValue(`${token} place`);
    await page.getByRole("button", { name: "ثبت انبار", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/warehouses\/\d+$/);
    await expect(page.getByRole("heading", { name: `${token} store`, exact: true })).toBeVisible();
    await page.getByRole("link", { name: "ویرایش انبار", exact: true }).click();
    await expect(page.getByLabel("کد انبار", { exact: true })).toHaveValue(warehouseCode);
    await page.getByLabel("نشانی یا محل انبار", { exact: true }).fill(`${token} updated`);
    await page.getByRole("checkbox", { name: "انبار فعال است", exact: true }).uncheck();
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات انبار", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/warehouses\/\d+$/);
    await expect(page.getByText("غیرفعال", { exact: true })).toBeVisible();

    await page.goto("/inventory/warehouses?active=all&keep=1&page=9");
    const search = page.getByLabel("جستجوی انبار", { exact: true });
    await search.fill(warehouseCode);
    await expect(page).toHaveURL(/search=/);
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();
    expect(new URL(page.url()).searchParams.get("keep")).toBe("1");
    await expect(search).toBeFocused();
    await expect(page.getByRole("row").filter({ hasText: warehouseCode })).toHaveCount(1);
    await captureResponsiveThemes(page, "warehouse-list");
    const stored = await adapter.underlyingDriver().request().input("code", warehouseCode).query<{ Location: string; IsActive: boolean }>("SELECT Location,IsActive FROM inventory.Warehouse WHERE WarehouseCode=@code");
    expect(stored.recordset).toEqual([{ Location: `${token} updated`, IsActive: false }]);

    await page.goto("/inventory/warehouses/create");
    await page.getByLabel("کد انبار", { exact: true }).fill(warehouseCode);
    await page.getByLabel("نام انبار", { exact: true }).fill("Duplicate attempt");
    await page.getByRole("button", { name: "ثبت انبار", exact: true }).click();
    await expect(page.getByText("این کد انبار قبلاً ثبت شده است.")).toBeVisible();
    await expect(page.getByLabel("نام انبار", { exact: true })).toHaveValue("Duplicate attempt");
  });
});
