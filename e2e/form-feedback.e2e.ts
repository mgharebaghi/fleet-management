import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";

test.describe("Live field feedback", () => {
  const token = `E2E-feedback-${randomUUID().slice(0, 12)}`;
  let adapter: E2EDatabaseAdapter;
  let unitId: number;
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    const result = await adapter.underlyingDriver().request().input("name", token).query<{ id: number }>("INSERT INTO inventory.Unit (UnitName) OUTPUT INSERTED.UnitId id VALUES (@name)");
    unitId = result.recordset[0].id;
  });
  test.afterAll(async () => {
    try { if (unitId) await adapter.underlyingDriver().request().input("id", unitId).query("DELETE FROM inventory.Unit WHERE UnitId=@id"); }
    finally { await adapter?.dispose(); }
  });

  test("clears individual person errors while retaining unedited fields", async ({ page }) => {
    await page.goto("/people/create");
    await page.getByRole("button", { name: "ثبت شخص", exact: true }).click();
    const first = page.getByLabel("نام", { exact: true }), last = page.getByLabel("نام خانوادگی", { exact: true });
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await first.fill("   ");
    await expect(first).toHaveAttribute("aria-invalid", "true");
    await first.fill("آزمایش");
    await expect(first).toHaveAttribute("aria-invalid", "false");
    await expect(last).toHaveAttribute("aria-invalid", "true");
    await last.fill("بازخورد");
    await expect(last).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
  });

  test("clears a part's summary only after text and searchable selection errors are addressed", async ({ page }) => {
    await page.goto("/inventory/parts/create");
    await page.getByRole("button", { name: "ثبت قطعه", exact: true }).click();
    const code = page.getByLabel("کد قطعه", { exact: true }), name = page.getByLabel("نام قطعه", { exact: true }), unit = page.getByLabel("واحد شمارش", { exact: true });
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await code.fill(token);
    await expect(code).toHaveAttribute("aria-invalid", "false");
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await name.fill("قطعهٔ آزمایشی");
    await expect(unit).toHaveAttribute("data-invalid", "true");
    await expect(page.getByRole("alert")).not.toHaveCount(0);
    await selectSearchableOption(page, "واحد شمارش", token, token);
    await expect(unit).not.toHaveAttribute("data-invalid", "true");
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
    // The same server validation must run again; correcting feedback never bypasses it.
    await code.fill("");
    await page.getByRole("button", { name: "ثبت قطعه", exact: true }).click();
    await expect(code).toHaveAttribute("aria-invalid", "true");
  });

  test("does not close a catalog dialog when a validation error is cleared", async ({ page }) => {
    await page.goto("/fleet/catalogs");
    await page.getByRole("region", { name: "برند خودرو", exact: true }).getByRole("button", { name: "+ افزودن", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "افزودن برند خودرو", exact: true });
    await dialog.getByRole("button", { name: "ثبت برند", exact: true }).click();
    const name = dialog.getByLabel("نام برند", { exact: true });
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await name.fill("آزمایش بدون ثبت");
    await expect(name).toHaveAttribute("aria-invalid", "false");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toHaveCount(0);
  });
});
