import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectJalaliDate } from "./support/jalali-calendar";

let adapter: E2EDatabaseAdapter;
let brandId: number | undefined, modelId: number | undefined, statusId: number | undefined;
const code = `E2E-V-${randomUUID()}`;
// Deliberately unrelated to `code`, so a match proves the relation was searched.
const catalogName = `E2E-CAT-${randomUUID().slice(0, 8)}`;

function getUrlSearchParams(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

test.describe.serial("Vehicles", () => {
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    const request = () => adapter.underlyingDriver().request();
    const baseline = await request().query<{ vehicle: number | null; status: number | null }>("SELECT OBJECT_ID(N'fleet.Vehicle') AS vehicle, OBJECT_ID(N'fleet.VehicleStatus') AS status");
    if (!baseline.recordset[0]?.vehicle || !baseline.recordset[0]?.status) throw new Error("E2E Vehicle baseline is missing.");
    const brand = await request().input("name", `${catalogName}-BRAND`).query<{ id: number }>("INSERT INTO fleet.VehicleBrand (BrandName) OUTPUT INSERTED.BrandId AS id VALUES (@name)"); brandId = brand.recordset[0].id;
    const model = await request().input("name", `${catalogName}-MODEL`).input("brand", brandId).query<{ id: number }>("INSERT INTO fleet.VehicleModel (ModelName, BrandId, IsActive) OUTPUT INSERTED.ModelId AS id VALUES (@name, @brand, 0)"); modelId = model.recordset[0].id;
    const status = await request().input("name", `${catalogName}-STATUS`).query<{ id: number }>("INSERT INTO fleet.VehicleStatus (StatusName) OUTPUT INSERTED.VehicleStatusId AS id VALUES (@name)"); statusId = status.recordset[0].id;
  });
  test.afterAll(async () => {
    if (!adapter) return;
    try {
      await adapter.underlyingDriver().request().input("code", code).query("DELETE FROM fleet.Vehicle WHERE VehicleCode = @code");
      if (modelId !== undefined) await adapter.underlyingDriver().request().input("id", modelId).query("DELETE FROM fleet.VehicleModel WHERE ModelId = @id");
      if (brandId !== undefined) await adapter.underlyingDriver().request().input("id", brandId).query("DELETE FROM fleet.VehicleBrand WHERE BrandId = @id");
      if (statusId !== undefined) await adapter.underlyingDriver().request().input("id", statusId).query("DELETE FROM fleet.VehicleStatus WHERE VehicleStatusId = @id");
    } finally { await adapter.dispose(); }
  });
  test("creates a vehicle using an inactive model, redirects and persists exact values", async ({ page }) => {
    await page.goto("/fleet/vehicles/create");
    await expect(page.getByAltText("نشان سامانه مدیریت ناوگان")).toBeVisible();
    await page.getByLabel("کد خودرو", { exact: true }).fill(code);
    await page.getByLabel("مدل خودرو", { exact: true }).selectOption(String(modelId));
    await expect(page.getByLabel("مدل خودرو").locator("option:checked")).toContainText("غیرفعال");
    await page.getByLabel("وضعیت عملیاتی", { exact: true }).selectOption(String(statusId));
    await page.getByLabel("دو رقم سمت چپ").fill("۱۲");
    await page.getByLabel("حرف یا بخش میانی").fill(randomUUID().slice(0, 3));
    await page.getByLabel("سه رقم سمت راست").fill("٣٤٥");
    await page.getByLabel("کد ایران").fill("۶۷");
    // The purchase date comes from the shared calendar panel, never typed.
    await page.getByRole("button", { name: "تاریخ خرید (شمسی)" }).click();
    const purchaseCalendar = page.getByRole("dialog", { name: "انتخاب تاریخ خرید (شمسی)" });
    await expect(purchaseCalendar).toBeVisible();
    await selectJalaliDate(purchaseCalendar, 1403, "فروردین", "۱");
    await expect(page.locator('input[name="purchaseDate"]')).toHaveValue("2024-03-20");
    // Grouped for the user, plain decimal for the Application.
    await page.getByLabel("قیمت خرید (تومان)").fill("9999999999999999.99");
    await expect(page.getByLabel("قیمت خرید (تومان)")).toHaveValue("9,999,999,999,999,999.99");
    await expect(page.locator('input[name="purchasePrice"]')).toHaveValue("9999999999999999.99");
    await page.getByLabel("کیلومتر فعلی").fill("0");
    await page.screenshot({ path: "test-results/vehicles-create.png", fullPage: true });
    await page.getByRole("button", { name: "ثبت خودرو", exact: true }).click();
    await expect(page).toHaveURL(/\/fleet\/vehicles$/);
    await expect(page.locator("tbody tr").first()).toContainText(code);
    const stored = await adapter.underlyingDriver().request().input("code", code).query<{ VehicleId: number; IsActive: boolean; price: string; date: string; PlateNoLeftSide: string; PlateNoRightSide: string; ModelId: number }>("SELECT VehicleId, IsActive, CONVERT(varchar(40), PurchasePrice) AS price, CONVERT(varchar(10), PurchaseDate, 23) AS date, PlateNoLeftSide, PlateNoRightSide, ModelId FROM fleet.Vehicle WHERE VehicleCode = @code");
    expect(stored.recordset).toHaveLength(1);
    expect(stored.recordset[0]).toMatchObject({ IsActive: true, price: "9999999999999999.99", date: "2024-03-20", PlateNoLeftSide: "12", PlateNoRightSide: "345", ModelId: modelId });
    expect(stored.recordset[0].VehicleId).toBeGreaterThan(0);
    await page.screenshot({ path: "test-results/vehicles-desktop.png", fullPage: true });
  });

  test("keeps a future purchase date unselectable in the calendar", async ({ page }) => {
    await page.goto("/fleet/vehicles/create");
    await page.getByRole("button", { name: "تاریخ خرید (شمسی)" }).click();
    const calendar = page.getByRole("dialog", { name: "انتخاب تاریخ خرید (شمسی)" });
    await expect(calendar).toBeVisible();

    // Step forward past today; every day beyond it must be disabled.
    await calendar.getByRole("button", { name: "ماه بعد" }).click();
    await calendar.getByRole("button", { name: "ماه بعد" }).click();
    const days = calendar.getByRole("group", { name: "روزهای ماه" }).getByRole("button");
    const dayCount = await days.count();
    expect(dayCount).toBeGreaterThan(0);
    for (let index = 0; index < dayCount; index += 1) {
      await expect(days.nth(index)).toBeDisabled();
    }

    await page.keyboard.press("Escape");
    await expect(calendar).toBeHidden();
    await expect(page.locator('input[name="purchaseDate"]')).toHaveValue("");
  });

  test("filters the list live, without a submit, and keeps the URL the source of truth", async ({ page }) => {
    await page.goto("/fleet/vehicles");
    await expect(page.getByRole("button", { name: "اعمال جستجو و فیلتر" })).toHaveCount(0);

    const searchInput = page.getByRole("searchbox", { name: "جستجوی خودرو" });
    await searchInput.fill(code);

    await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(code)}`));
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await page.getByLabel("وضعیت عملیاتی", { exact: true }).selectOption(String(statusId));
    await expect(page).toHaveURL(new RegExp(`status=${statusId}`));
    expect(getUrlSearchParams(page).get("search")).toBe(code);
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await page.getByLabel("فعال بودن رکورد").selectOption("inactive");
    await expect(page).toHaveURL(/active=inactive/);
    await expect(page.getByRole("heading", { name: "خودرویی مطابق جستجو یا فیلتر پیدا نشد" })).toBeVisible();

    await page.getByLabel("فعال بودن رکورد").selectOption("all");
    await expect(page).toHaveURL(/active=all/);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    expect(getUrlSearchParams(page).get("search")).toBe(code);
    expect(getUrlSearchParams(page).get("status")).toBe(String(statusId));
  });

  test("resets paging on a new search and keeps the search box focused while typing", async ({ page }) => {
    await page.goto("/fleet/vehicles?page=2");

    const searchInput = page.getByRole("searchbox", { name: "جستجوی خودرو" });
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    const firstPart = code.slice(0, -4);
    const secondPart = code.slice(-4);

    await searchInput.pressSequentially(firstPart, { delay: 30 });
    await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(firstPart)}`));
    await expect(searchInput).toBeFocused();
    expect(getUrlSearchParams(page).has("page")).toBe(false);

    // Continues typing without re-clicking the field.
    await searchInput.pressSequentially(secondPart, { delay: 30 });
    await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(code)}`));
    await expect(searchInput).toBeFocused();
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await searchInput.fill("");
    await expect(page).toHaveURL(/\/fleet\/vehicles$/);
  });

  test("searches the related brand, model and operational status shown in the list", async ({ page }) => {
    await page.goto("/fleet/vehicles");
    const searchInput = page.getByRole("searchbox", { name: "جستجوی خودرو" });

    // None of these appear in the vehicle's own columns, so only a relation
    // filter can produce the row.
    for (const relationName of [`${catalogName}-BRAND`, `${catalogName}-MODEL`, `${catalogName}-STATUS`]) {
      await searchInput.fill(relationName);
      await expect(page).toHaveURL(new RegExp(`search=${encodeURIComponent(relationName)}`));
      await expect(page.locator("tbody tr").filter({ hasText: code })).toHaveCount(1);
    }

    await searchInput.fill(`${catalogName}-NOTFOUND`);
    await expect(page.getByRole("heading", { name: "خودرویی مطابق جستجو یا فیلتر پیدا نشد" })).toBeVisible();
  });

  test("renders the created vehicle as a mobile card without horizontal overflow", async ({ page }) => {
    await page.goto(`/fleet/vehicles?search=${encodeURIComponent(code)}`);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("table")).toBeHidden();
    await expect(page.locator("main ul li").filter({ hasText: code })).toBeVisible();
    expect(await page.locator("main").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: "test-results/vehicles-mobile.png", fullPage: true });
  });
});
