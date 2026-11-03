import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe("Warehouse lifecycle actions", () => {
  const token = `E2E-WH-${randomUUID().slice(0, 10)}`;
  const usedName = `${token}-used`, unusedName = `${token}-unused`;
  let adapter: E2EDatabaseAdapter;
  test.beforeAll(async () => {
    test.setTimeout(60000);
    adapter = await connectToE2EDatabase();
    await adapter.underlyingDriver().request().input("used", usedName).input("unused", unusedName).query(`
      DECLARE @unit int,@part int,@warehouse int;
      INSERT inventory.Unit (UnitName) VALUES (@used); SET @unit=SCOPE_IDENTITY();
      INSERT inventory.Part (PartCode,PartName,UnitId) VALUES (@used,@used,@unit); SET @part=SCOPE_IDENTITY();
      INSERT inventory.Warehouse (WarehouseCode,WarehouseName,Location) VALUES (@used,@used,N'Original location'); SET @warehouse=SCOPE_IDENTITY();
      INSERT inventory.Warehouse (WarehouseCode,WarehouseName) VALUES (@unused,@unused);
      INSERT inventory.StockTransaction (WarehouseId,PartId,TransactionType,Quantity) VALUES (@warehouse,@part,N'Receipt',1),(@warehouse,@part,N'Issue',1);
    `);
  });
  test.afterAll(async () => {
    test.setTimeout(60000);
    try { if (adapter) {
      await adapter.underlyingDriver().request().input("used", usedName).input("unused", unusedName).query(`
        DELETE s FROM inventory.StockTransaction s JOIN inventory.Warehouse w ON w.WarehouseId=s.WarehouseId WHERE w.WarehouseCode=@used;
        DELETE inventory.Part WHERE PartCode=@used;
        DELETE inventory.Unit WHERE UnitName=@used;
        DELETE inventory.Warehouse WHERE WarehouseCode IN (@used,@unused);
      `);
    } } finally { await adapter?.dispose(); }
  });

  test("confirms deletion, preserves used warehouses and changes activity without losing history", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto(`/inventory/warehouses?active=all&search=${token}`);
    await captureResponsiveThemes(page, "warehouse-actions");
    const unused = page.getByRole("row").filter({ hasText: unusedName });
    await expect(unused.getByRole("button", { name: `حذف ${unusedName}`, exact: true })).toBeEnabled();
    await unused.getByRole("button", { name: `حذف ${unusedName}`, exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "حذف انبار", exact: true });
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    await expect(unused).toBeVisible();
    await unused.getByRole("button", { name: `حذف ${unusedName}`, exact: true }).click();
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(unused).toHaveCount(0);

    const used = page.getByRole("row").filter({ hasText: usedName });
    await expect(used.getByRole("button", { name: `حذف ${usedName} امکان‌پذیر نیست؛ این انبار سابقهٔ گردش دارد`, exact: true })).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: `حذف ${usedName} امکان‌پذیر نیست؛ این انبار سابقهٔ گردش دارد`, exact: true }).filter({ visible: true })).toBeDisabled();
    await page.setViewportSize({ width: 1280, height: 720 });
    await used.getByRole("button", { name: `غیرفعال‌سازی ${usedName}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "غیرفعال‌سازی انبار", exact: true });
    await dialog.getByRole("button", { name: "تأیید", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(used.getByRole("cell").nth(3)).toHaveText("غیرفعال");
    await used.getByRole("button", { name: `فعال‌سازی ${usedName}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "فعال‌سازی انبار", exact: true });
    await dialog.getByRole("button", { name: "تأیید", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(used.getByRole("cell").nth(3)).toHaveText("فعال");
    const result = await adapter.underlyingDriver().request().input("used", usedName).input("unused", unusedName).query<{ IsActive: boolean; Location: string; movements: number; unused: number }>(`
      SELECT IsActive,Location,(SELECT COUNT(*) FROM inventory.StockTransaction s WHERE s.WarehouseId=w.WarehouseId) movements,
      (SELECT COUNT(*) FROM inventory.Warehouse WHERE WarehouseCode=@unused) unused FROM inventory.Warehouse w WHERE WarehouseCode=@used;
    `);
    expect(result.recordset).toEqual([{ IsActive: true, Location: "Original location", movements: 2, unused: 0 }]);
  });
});
