import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { selectJalaliDate } from "./support/jalali-calendar";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe.serial("Inventory stock ledger", () => {
  const token = `E2E-stock-${randomUUID().slice(0, 12)}`;
  let adapter: E2EDatabaseAdapter;
  let partId: number, warehouseId: number;
  test.beforeAll(async () => {
    test.setTimeout(60000);
    adapter = await connectToE2EDatabase();
    const result = await adapter.underlyingDriver().request().input("token", token).query<{ partId: number; warehouseId: number }>(`
      DECLARE @unit int,@part int,@warehouse int;
      INSERT INTO inventory.Unit (UnitName) VALUES (@token); SET @unit=SCOPE_IDENTITY();
      INSERT INTO inventory.Part (PartCode,PartName,UnitId,MinStock,ReorderPoint) VALUES (@token,@token,@unit,5,10); SET @part=SCOPE_IDENTITY();
      INSERT INTO inventory.Warehouse (WarehouseCode,WarehouseName) VALUES (@token,@token); SET @warehouse=SCOPE_IDENTITY();
      SELECT @part partId,@warehouse warehouseId;
    `);
    partId = result.recordset[0].partId; warehouseId = result.recordset[0].warehouseId;
  });
  test.afterAll(async () => {
    test.setTimeout(60000);
    try { if (adapter) {
      const result = await adapter.underlyingDriver().request().input("token", token).query<{ remaining: number }>(`
        DELETE s FROM inventory.StockTransaction s JOIN inventory.Part p ON p.PartId=s.PartId WHERE p.PartCode=@token;
        DELETE FROM inventory.Part WHERE PartCode=@token;
        DELETE FROM inventory.Warehouse WHERE WarehouseCode=@token;
        DELETE FROM inventory.Unit WHERE UnitName=@token;
        SELECT COUNT(*) remaining FROM inventory.Part WHERE PartCode=@token;
      `); expect(result.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });

  async function startMovement(page: Page, type: string, quantity: string, description = "") {
    await page.goto(`/inventory/movements/create?partId=${partId}&warehouseId=${warehouseId}`);
    await page.getByLabel("نوع گردش", { exact: true }).selectOption(type);
    await page.getByLabel("مقدار", { exact: true }).fill(quantity);
    if (description) await page.getByLabel("توضیحات", { exact: true }).fill(description);
  }
  async function confirm(page: Page) {
    await page.getByRole("button", { name: "ثبت گردش", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "ثبت قطعی گردش انبار", exact: true });
    await dialog.getByRole("button", { name: "تأیید و ثبت", exact: true }).click();
  }

  test("records opening 10, issue 3 and return 1, displaying balance 8 through shared responsive UI", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/inventory/movements/create");
    await captureResponsiveThemes(page, "stock-create");
    await selectSearchableOption(page, "انبار", token, token);
    await selectSearchableOption(page, "قطعه", token, token);
    await page.getByLabel("نوع گردش", { exact: true }).selectOption("Opening");
    await page.getByLabel("مقدار", { exact: true }).fill("10");
    await page.getByLabel(/قیمت هر واحد/).fill("1250.50");
    await confirm(page);
    await expect(page).toHaveURL(/\/inventory\/movements\?.*recorded=/, { timeout: 30000 });
    await expect(page.getByRole("row").filter({ hasText: token })).toContainText("موجودی اولیه");
    await startMovement(page, "Issue", "3"); await confirm(page);
    await expect(page).toHaveURL(/recorded=/, { timeout: 30000 });
    await startMovement(page, "Return", "1", "برگشت قطعهٔ مصرف‌نشده"); await confirm(page);
    await expect(page).toHaveURL(/recorded=/, { timeout: 30000 });
    await page.goto(`/inventory/stock?partId=${partId}&warehouseId=${warehouseId}`);
    const row = page.getByRole("row").filter({ hasText: token });
    await expect(row.getByRole("cell").nth(3)).toHaveText("8.00");
    await expect(row.getByRole("cell").nth(4)).toHaveText("8.00");
    await expect(row).toContainText("نیاز به تأمین");
    await expect(row).toContainText(`کد قطعه: ${token}`);
    await expect(row).toContainText(`کد انبار: ${token}`);
    await captureResponsiveThemes(page, "stock-balance");
    await row.getByRole("link", { name: `گردش ${token} در ${token}`, exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/movements\?/);
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(3);
    await captureResponsiveThemes(page, "stock-movements");
    await expect(page.getByRole("button", { name: /^حذف/ })).toHaveCount(0);
    const stored = await adapter.underlyingDriver().request().input("id", partId).query<{ type: string; quantity: string; price: string | null }>("SELECT TransactionType type,CONVERT(varchar(40),Quantity) quantity,CONVERT(varchar(40),UnitPrice) price FROM inventory.StockTransaction WHERE PartId=@id ORDER BY StockTransactionId");
    expect(stored.recordset).toEqual([{ type: "Opening", quantity: "10.00", price: "1250.50" }, { type: "Issue", quantity: "3.00", price: null }, { type: "Return", quantity: "1.00", price: null }]);
  });

  test("rejects over-issue and duplicate opening, retains input, and filters dates without changing balance", async ({ page }) => {
    test.setTimeout(150000);
    await startMovement(page, "Issue", "9");
    await page.getByLabel(/قیمت هر واحد/).fill("12.34");
    await confirm(page);
    await expect(page.locator("#stock-append-form").getByRole("alert")).toHaveText("موجودی این قطعه در انبار انتخاب‌شده کافی نیست.");
    await expect(page.getByLabel("مقدار", { exact: true })).toHaveValue("9");
    await expect(page.locator('input[name="unitPrice"]')).toHaveValue("12.34");
    await page.getByLabel("نوع گردش", { exact: true }).selectOption("Opening");
    await confirm(page);
    await expect(page.locator("#stock-append-form").getByRole("alert")).toContainText("موجودی اولیه دوباره قابل ثبت نیست");
    await page.goto(`/inventory/movements?partId=${partId}&warehouseId=${warehouseId}&keep=1`);
    await page.getByRole("button", { name: "از تاریخ", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب از تاریخ", exact: true }), 1406, "فروردین", "۱");
    await expect(page).toHaveURL(/from=2027-03-21/);
    expect(new URL(page.url()).searchParams.get("keep")).toBe("1");
    await expect(page.getByRole("heading", { name: "گردشی مطابق جستجو ثبت نشده است" })).toBeVisible();
    await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).click();
    await expect(page).toHaveURL(/\/inventory\/movements\?keep=1$/);
    await expect(page.getByRole("button", { name: "از تاریخ", exact: true })).toContainText("انتخاب تاریخ");
    await page.goto(`/inventory/stock?partId=${partId}&warehouseId=${warehouseId}`);
    await expect(page.getByRole("row").filter({ hasText: token }).getByRole("cell").nth(3)).toHaveText("8.00");
    const count = await adapter.underlyingDriver().request().input("id", partId).query<{ count: number }>("SELECT COUNT(*) count FROM inventory.StockTransaction WHERE PartId=@id");
    expect(count.recordset[0].count).toBe(3);
  });

  test("shows red unavailable status after the remaining stock is issued", async ({ page }) => {
    test.setTimeout(120000);
    await startMovement(page, "Issue", "8");
    await confirm(page);
    await expect(page).toHaveURL(/recorded=/, { timeout: 30000 });
    const issue = page.getByRole("row").filter({ hasText: token }).first().getByText("خروج", { exact: true });
    await expect(issue).toHaveClass(/negative/);
    const returned = page.getByRole("row").filter({ hasText: token }).getByText("برگشت مصرف‌نشده", { exact: true });
    await expect(returned).toHaveClass(/positive/);
    await page.goto(`/inventory/stock?partId=${partId}&warehouseId=${warehouseId}`);
    const row = page.getByRole("row").filter({ hasText: token });
    await expect(row.getByRole("cell").nth(3)).toHaveText("0.00");
    await expect(row.getByRole("cell").nth(5)).toHaveText("عدم موجودی");
    await expect(row).not.toContainText("کمتر از حداقل");
    await expect(row).not.toContainText("نیاز به تأمین");
    await captureResponsiveThemes(page, "stock-empty");
  });
});
