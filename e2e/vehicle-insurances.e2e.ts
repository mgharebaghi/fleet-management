import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectJalaliDate } from "./support/jalali-calendar";
import { expectSearchableSelectValue, selectSearchableOption, searchableSelectTrigger } from "./support/searchable-select";

let adapter: E2EDatabaseAdapter;
let brandId: number | undefined, modelId: number | undefined, statusId: number | undefined, vehicleId: number | undefined;
const token = randomUUID();
const vehicleCode = `E2E-IV-${token}`;
const policy = `E2E-Policy-${token}`;
const type = `E2E-Insurance-${token}`;
const listPath = "/fleet/vehicle-insurances";

test.describe.serial("Vehicle insurances", () => {
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    const request = () => adapter.underlyingDriver().request();
    const baseline = await request().query<{ insurance: number | null; vehicle: number | null; status: number | null }>("SELECT OBJECT_ID(N'fleet.VehicleInsurance') AS insurance, OBJECT_ID(N'fleet.Vehicle') AS vehicle, OBJECT_ID(N'fleet.VehicleStatus') AS status");
    if (!baseline.recordset[0]?.insurance || !baseline.recordset[0]?.vehicle || !baseline.recordset[0]?.status) throw new Error("Insurance E2E baseline is missing.");
    const brand = await request().input("name", token).query<{ id: number }>("INSERT INTO fleet.VehicleBrand (BrandName) OUTPUT INSERTED.BrandId AS id VALUES (@name)"); brandId = brand.recordset[0].id;
    const model = await request().input("name", token).input("brand", brandId).query<{ id: number }>("INSERT INTO fleet.VehicleModel (ModelName, BrandId) OUTPUT INSERTED.ModelId AS id VALUES (@name, @brand)"); modelId = model.recordset[0].id;
    const status = await request().input("name", token).query<{ id: number }>("INSERT INTO fleet.VehicleStatus (StatusName) OUTPUT INSERTED.VehicleStatusId AS id VALUES (@name)"); statusId = status.recordset[0].id;
    const vehicle = await request().input("code", vehicleCode).input("model", modelId).input("status", statusId).query<{ id: number }>("INSERT INTO fleet.Vehicle (VehicleCode, PlateNoLeftSide, PlateNoCenterChar, PlateNoRightSide, PlateNoIranNo, ModelId, VehicleStatusId, IsActive) OUTPUT INSERTED.VehicleId AS id VALUES (@code, N'12', N'X', N'345', N'67', @model, @status, 0)"); vehicleId = vehicle.recordset[0].id;
  });
  test.afterAll(async () => {
    if (!adapter) return;
    try {
      const request = () => adapter.underlyingDriver().request();
      if (vehicleId !== undefined) {
        await request().input("id", vehicleId).query("DELETE FROM fleet.VehicleInsurance WHERE VehicleId = @id");
        const remaining = await request().input("id", vehicleId).query<{ count: number }>("SELECT COUNT(*) AS count FROM fleet.VehicleInsurance WHERE VehicleId = @id");
        expect(remaining.recordset[0].count).toBe(0);
        await request().input("id", vehicleId).query("DELETE FROM fleet.Vehicle WHERE VehicleId = @id");
      }
      if (modelId !== undefined) await request().input("id", modelId).query("DELETE FROM fleet.VehicleModel WHERE ModelId = @id");
      if (brandId !== undefined) await request().input("id", brandId).query("DELETE FROM fleet.VehicleBrand WHERE BrandId = @id");
      if (statusId !== undefined) await request().input("id", statusId).query("DELETE FROM fleet.VehicleStatus WHERE VehicleStatusId = @id");
    } finally { await adapter.dispose(); }
  });

  test("creates an expired insurance on an inactive vehicle, preserves dates/amounts and redirects to the list", async ({ page }) => {
    await page.goto(`${listPath}/create`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.getByLabel("خودرو", { exact: true }).click();
    const vehiclePanel = page.getByRole("dialog", { name: "جستجوی خودرو" });
    // Search by a plate fragment first, to prove the picker matches on the plate, not just the name.
    await vehiclePanel.getByRole("combobox").fill("345");
    await expect(vehiclePanel.getByRole("option", { name: token })).toBeVisible();
    await vehiclePanel.getByRole("combobox").fill(token);
    await vehiclePanel.getByRole("option", { name: token }).click();
    const vehicleTrigger = searchableSelectTrigger(page, "خودرو");
    await expect(vehicleTrigger).toContainText("غیرفعال");
    await expect(vehicleTrigger).toContainText(token);
    await expectSearchableSelectValue(page, "vehicleId", String(vehicleId));
    await page.getByLabel("نوع بیمه", { exact: true }).fill(type);
    // A selected vehicle must stay a single-line control, not a rich multi-line row.
    const triggerBox = await vehicleTrigger.boundingBox();
    const insuranceTypeBox = await page.getByLabel("نوع بیمه", { exact: true }).boundingBox();
    if (triggerBox === null || insuranceTypeBox === null) throw new Error("Expected both fields to be visible.");
    expect(triggerBox.height).toBeLessThan(insuranceTypeBox.height * 1.5);
    await page.getByLabel("شرکت بیمه", { exact: true }).fill(`Company-${token}`);
    await page.getByLabel("شماره بیمه‌نامه", { exact: true }).fill(policy);
    await page.getByRole("button", { name: "تاریخ شروع (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ شروع (شمسی)" }), 1403, "فروردین", "۱");
    await page.getByRole("button", { name: "تاریخ انقضا (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ انقضا (شمسی)" }), 1404, "فروردین", "۱");
    await page.getByLabel("حق بیمه (تومان)").fill("9999999999999999.99");
    await page.getByLabel("سقف پوشش (تومان)").fill("1234567890123456.78");
    await page.screenshot({ path: "test-results/insurance-create.png", fullPage: true });
    await page.getByRole("button", { name: "ثبت بیمه خودرو", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${listPath}$`));
    await expect(page.locator("tbody tr").first()).toContainText(policy);
    await expect(page.locator("tbody tr").first()).toContainText("9,999,999,999,999,999.99");
    const result = await adapter.underlyingDriver().request().input("vehicle", vehicleId).input("policy", policy).query<{ id: string; active: boolean; start: string; expiry: string; premium: string; coverage: string }>("SELECT CONVERT(varchar(20), VehicleInsuranceId) AS id, IsActive AS active, CONVERT(varchar(10), StartDate, 23) AS start, CONVERT(varchar(10), ExpireDate, 23) AS expiry, CONVERT(varchar(40), PremiumAmount) AS premium, CONVERT(varchar(40), CoverageAmount) AS coverage FROM fleet.VehicleInsurance WHERE VehicleId=@vehicle AND PolicyNo=@policy");
    expect(result.recordset).toHaveLength(1);
    expect(result.recordset[0]).toMatchObject({ active: true, start: "2024-03-20", expiry: "2025-03-21", premium: "9999999999999999.99", coverage: "1234567890123456.78" });
    expect(BigInt(result.recordset[0].id)).toBeGreaterThan(BigInt(0));
    await page.screenshot({ path: "test-results/insurance-desktop.png", fullPage: true });
  });

  test("wires live search and activity filtering and renders a mobile card", async ({ page }) => {
    await page.goto(`${listPath}?page=2&source=e2e`);
    const search = page.getByRole("searchbox", { name: "جستجوی بیمه خودرو" });
    for (const value of [vehicleCode, type, `Company-${token}`, policy, token]) {
      await search.fill(value);
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(value)}`));
      await expect(search).toBeFocused();
    }
    expect(new URL(page.url()).searchParams.has("page")).toBe(false);
    expect(new URL(page.url()).searchParams.get("source")).toBe("e2e");
    await page.getByLabel("وضعیت رکورد", { exact: true }).selectOption("inactive");
    await expect(page.getByRole("heading", { name: "بیمه‌ای مطابق جستجو یا فیلتر پیدا نشد" })).toBeVisible();
    await page.getByLabel("وضعیت رکورد", { exact: true }).selectOption("all");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    // At a normal desktop viewport the grouped table must fit without forcing a scrollbar.
    expect(await page.locator("main").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("table")).toBeHidden();
    await expect(page.locator("main ul li").filter({ hasText: policy })).toBeVisible();
    expect(await page.locator("main").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: "test-results/insurance-mobile.png", fullPage: true });
  });

  test("shows date-order validation, retains form values and accepts future insurance with optional fields empty", async ({ page }) => {
    await page.goto(`${listPath}/create`);
    await selectSearchableOption(page, "خودرو", token, token);
    await page.getByLabel("نوع بیمه", { exact: true }).fill(`${type}-future`);
    await page.getByRole("button", { name: "تاریخ شروع (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ شروع (شمسی)" }), 1407, "فروردین", "۱");
    await page.getByRole("button", { name: "تاریخ انقضا (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ انقضا (شمسی)" }), 1406, "فروردین", "۱");
    await page.getByRole("button", { name: "ثبت بیمه خودرو", exact: true }).click();
    await expect(page.getByText("تاریخ انقضا نمی‌تواند پیش از تاریخ شروع باشد.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("نوع بیمه", { exact: true })).toHaveValue(`${type}-future`);
    await expect(searchableSelectTrigger(page, "خودرو")).toContainText(token);
    await expectSearchableSelectValue(page, "vehicleId", String(vehicleId));
    await page.getByRole("button", { name: "تاریخ انقضا (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ انقضا (شمسی)" }), 1407, "فروردین", "۱");
    await page.getByRole("button", { name: "ثبت بیمه خودرو", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${listPath}$`));
    await expect(page.locator("tbody tr").first()).toContainText(`${type}-future`);
    const rows = await adapter.underlyingDriver().request().input("vehicle", vehicleId).input("type", `${type}-future`).query<{ company: null; policy: null; premium: null; coverage: null }>("SELECT InsuranceCompany AS company, PolicyNo AS policy, PremiumAmount AS premium, CoverageAmount AS coverage FROM fleet.VehicleInsurance WHERE VehicleId=@vehicle AND InsuranceType=@type");
    expect(rows.recordset).toEqual([{ company: null, policy: null, premium: null, coverage: null }]);
  });
});
