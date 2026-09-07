import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, createPerson, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { selectJalaliDate } from "./support/jalali-calendar";

let adapter: E2EDatabaseAdapter;
let personId: number | undefined, brandId: number | undefined, modelId: number | undefined, statusId: number | undefined, vehicleId: number | undefined;
let driverId: number;
const token = randomUUID();
const vehicleCode = `E2E-D-${token}`;
const request = () => adapter.underlyingDriver().request();

test.describe.serial("Drivers management", () => {
  test.beforeAll(async () => {
    adapter = await connectToE2EDatabase();
    const baseline = await request().query<{ driver: number | null; license: number | null; assignment: number | null }>("SELECT OBJECT_ID('driver.Driver') AS driver, OBJECT_ID('driver.DriverLicense') AS license, OBJECT_ID('driver.VehicleDriverAssignment') AS assignment");
    if (!baseline.recordset[0]?.driver || !baseline.recordset[0]?.license || !baseline.recordset[0]?.assignment) throw new Error("Drivers E2E baseline missing.");
    personId = await createPerson(adapter, { firstName: "E2E Driver", lastName: token, personnelNo: token, isActive: true });
    brandId = (await request().input("name", token).query<{ id: number }>("INSERT INTO fleet.VehicleBrand (BrandName) OUTPUT INSERTED.BrandId AS id VALUES (@name)")).recordset[0].id;
    modelId = (await request().input("name", token).input("brand", brandId).query<{ id: number }>("INSERT INTO fleet.VehicleModel (ModelName, BrandId) OUTPUT INSERTED.ModelId AS id VALUES (@name, @brand)")).recordset[0].id;
    statusId = (await request().input("name", token).query<{ id: number }>("INSERT INTO fleet.VehicleStatus (StatusName) OUTPUT INSERTED.VehicleStatusId AS id VALUES (@name)")).recordset[0].id;
    vehicleId = (await request().input("code", vehicleCode).input("model", modelId).input("status", statusId).query<{ id: number }>("INSERT INTO fleet.Vehicle (VehicleCode, PlateNoLeftSide, ModelId, VehicleStatusId) OUTPUT INSERTED.VehicleId AS id VALUES (@code, '12', @model, @status)")).recordset[0].id;
  });
  test.afterAll(async () => {
    if (!adapter) return;
    try {
      if (personId !== undefined) {
        await request().input("id", personId).query("DELETE FROM driver.VehicleDriverAssignment WHERE DriverId IN (SELECT DriverId FROM driver.Driver WHERE PersonId=@id); DELETE FROM driver.DriverLicense WHERE DriverId IN (SELECT DriverId FROM driver.Driver WHERE PersonId=@id); DELETE FROM driver.Driver WHERE PersonId=@id; DELETE FROM person.People WHERE PersonId=@id;");
        const remaining = await request().input("id", personId).input("vehicle", vehicleId ?? -1).query<{ people: number; drivers: number; assignments: number }>("SELECT (SELECT COUNT(*) FROM person.People WHERE PersonId=@id) AS people, (SELECT COUNT(*) FROM driver.Driver WHERE PersonId=@id) AS drivers, (SELECT COUNT(*) FROM driver.VehicleDriverAssignment WHERE VehicleId=@vehicle) AS assignments");
        expect(remaining.recordset[0]).toEqual({ people: 0, drivers: 0, assignments: 0 });
      }
      if (vehicleId !== undefined) await request().input("id", vehicleId).query("DELETE FROM fleet.Vehicle WHERE VehicleId=@id");
      if (modelId !== undefined) await request().input("id", modelId).query("DELETE FROM fleet.VehicleModel WHERE ModelId=@id");
      if (brandId !== undefined) await request().input("id", brandId).query("DELETE FROM fleet.VehicleBrand WHERE BrandId=@id");
      if (statusId !== undefined) await request().input("id", statusId).query("DELETE FROM fleet.VehicleStatus WHERE VehicleStatusId=@id");
    } finally { await adapter.dispose(); }
  });

  test("defines a driver, registers a license, assigns and closes the same history record", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/drivers/create");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await selectSearchableOption(page, "شخص", token, token);
    await page.getByRole("button", { name: "تعریف راننده", exact: true }).click();
    await expect(page).toHaveURL(/\/drivers\/\d+$/);
    driverId = Number(page.url().split("/").pop());
    // A driver with no license yet cannot be assigned a vehicle.
    const newAssignment = page.getByRole("button", { name: "تخصیص جدید", exact: true });
    await expect(newAssignment).toBeDisabled();
    await expect(page.getByText("برای ثبت تخصیص، ابتدا باید یک گواهینامه برای راننده ثبت شود.", { exact: true })).toBeVisible();
    await page.getByText("افزودن گواهینامه", { exact: true }).click();
    const license = page.getByRole("form", { name: "ثبت گواهینامه", exact: true });
    await license.getByLabel("نوع گواهینامه", { exact: true }).fill("Heavy");
    await license.getByLabel("شمارهٔ گواهینامه", { exact: true }).fill(token);
    await license.getByRole("button", { name: "ثبت گواهینامه", exact: true }).click();
    await expect(page.locator("tbody tr").filter({ hasText: token })).toContainText("فعال و معتبر");
    await page.getByRole("button", { name: "ویرایش گواهینامه Heavy" }).click();
    const editLicense = page.getByRole("form", { name: "ذخیره تغییرات گواهینامه" });
    await expect(editLicense.getByLabel("شمارهٔ گواهینامه", { exact: true })).toHaveValue(token);
    await editLicense.getByLabel("نوع گواهینامه", { exact: true }).fill("Heavy Edited");
    await editLicense.getByRole("button", { name: "ذخیره تغییرات گواهینامه", exact: true }).click();
    await expect(page.locator("tbody tr").filter({ hasText: token })).toContainText("Heavy Edited");
    // The registered license unlocks assignment and clears the hint.
    await expect(newAssignment).toBeEnabled();
    await expect(page.getByText("برای ثبت تخصیص، ابتدا باید یک گواهینامه برای راننده ثبت شود.", { exact: true })).toBeHidden();
    await newAssignment.click();
    const assign = page.getByRole("form", { name: "ثبت تخصیص", exact: true });
    await selectSearchableOption(assign, "خودرو", token, token);
    // The picked vehicle stays readable: brand/model plus the shared plate.
    await expect(assign.getByLabel("خودرو", { exact: true })).toContainText(token);
    await expect(assign.getByLabel("خودرو", { exact: true })).toContainText("ایران");
    await assign.getByLabel("کیلومتر شروع", { exact: true }).fill("1234567890123456.78");
    await assign.getByRole("button", { name: "تاریخ شروع (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ شروع (شمسی)" }), 1404, "فروردین", "۱");
    await assign.getByLabel("ساعت شروع (تهران)", { exact: true }).selectOption("08");
    await assign.getByRole("button", { name: "ثبت تخصیص", exact: true }).click();
    const current = page.getByRole("region", { name: "تخصیص جاری", exact: true });
    await expect(current).toContainText(vehicleCode);
    // Brand/model plus the shared formatted plate, not a raw identifier.
    await expect(current).toContainText(token);
    await expect(current).toContainText("ایران");
    const stored = await request().input("id", driverId).query<{ id: number; start: string; from: string; end: null }>("SELECT AssignmentId AS id, CONVERT(varchar(40), StartOdometer) AS start, CONVERT(varchar(30), FromDateTime,126) AS [from], ToDateTime AS [end] FROM driver.VehicleDriverAssignment WHERE DriverId=@id");
    expect(stored.recordset).toHaveLength(1);
    const assignmentId = stored.recordset[0].id;
    expect(stored.recordset[0]).toMatchObject({ start: "1234567890123456.78", from: "2025-03-21T04:30:00", end: null });
    await page.screenshot({ path: "test-results/drivers-current-desktop.png", fullPage: true });
    await current.getByRole("button", { name: "پایان تخصیص", exact: true }).click();
    const close = current.getByRole("form", { name: "ثبت پایان تخصیص", exact: true });
    await close.getByRole("button", { name: "تاریخ پایان (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ پایان (شمسی)" }), 1404, "فروردین", "۲");
    await close.getByLabel("ساعت پایان (تهران)", { exact: true }).selectOption("08");
    await close.getByLabel("کیلومتر پایان", { exact: true }).fill("1234567890123456.79");
    await close.getByRole("button", { name: "ثبت پایان تخصیص", exact: true }).click();
    await expect(current).toContainText("تخصیص جاری ندارد");
    const history = page.getByRole("region", { name: "تاریخچه", exact: true });
    await expect(history.getByTestId(`assignment-${assignmentId}`)).toContainText("پایان‌یافته");
    const ended = await request().input("id", driverId).query<{ id: number; end: string; odometer: string }>("SELECT AssignmentId AS id, CONVERT(varchar(30), ToDateTime,126) AS [end], CONVERT(varchar(40),EndOdometer) AS odometer FROM driver.VehicleDriverAssignment WHERE DriverId=@id");
    expect(ended.recordset).toEqual([{ id: assignmentId, end: "2025-03-22T04:30:00", odometer: "1234567890123456.79" }]);
    // A completed assignment is the immutable record: no edit control remains on it.
    await expect(history.getByRole("button", { name: `ویرایش تخصیص ${vehicleCode}` })).toHaveCount(0);

    // A future assignment stays editable and deletable, and gets its own section.
    await page.getByText("تخصیص جدید", { exact: true }).click();
    const futureAssign = page.getByRole("form", { name: "ثبت تخصیص", exact: true });
    await selectSearchableOption(futureAssign, "خودرو", token, token);
    await futureAssign.getByRole("button", { name: "تاریخ شروع (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ شروع (شمسی)" }), 1406, "فروردین", "۱");
    await futureAssign.getByLabel("ساعت شروع (تهران)", { exact: true }).selectOption("08");
    await futureAssign.getByRole("button", { name: "ثبت تخصیص", exact: true }).click();
    const future = page.getByRole("region", { name: "تخصیص‌های آینده", exact: true });
    await expect(future).toContainText(vehicleCode);
    await expect(future).toContainText("آینده");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("table")).toBeHidden();
    await expect(page.locator("main li").filter({ hasText: token })).toBeVisible();
    expect(await page.locator("main").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: "test-results/drivers-history-mobile.png", fullPage: true });

    await page.setViewportSize({ width: 390, height: 500 });
    const pageScrollRange = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    expect(pageScrollRange).toBeGreaterThan(0);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);

    await future.getByRole("button", { name: `ویرایش تخصیص ${vehicleCode}` }).click();
    const mobileEditDialog = page.getByRole("dialog", { name: "ویرایش تخصیص خودرو" });
    const dialogBox = await mobileEditDialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(500);
    await expect(page.locator("html")).toHaveCSS("overflow", "hidden");
    const dialogBody = mobileEditDialog.locator(":scope > div > div").last();
    expect(await dialogBody.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
    await dialogBody.evaluate(element => { element.scrollTop = element.scrollHeight; });
    expect(await dialogBody.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    const editAssignment = page.getByRole("form", { name: "ذخیره تغییرات تخصیص" });
    await editAssignment.getByLabel("توضیحات", { exact: true }).fill("اصلاح پیش از شروع");
    await editAssignment.getByRole("button", { name: "ذخیره تغییرات تخصیص", exact: true }).click();
    await expect(page.locator("html")).not.toHaveCSS("overflow", "hidden");
    await expect(future).toContainText("اصلاح پیش از شروع");

    await page.setViewportSize({ width: 1280, height: 900 });
    await future.getByRole("button", { name: /^حذف تخصیص/ }).click();
    const deleteFutureDialog = page.getByRole("dialog", { name: "حذف تخصیص", exact: true });
    await expect(deleteFutureDialog).toContainText(token);
    await deleteFutureDialog.getByRole("button", { name: "حذف تخصیص", exact: true }).click();
    await expect(page.getByRole("region", { name: "تخصیص‌های آینده" })).toHaveCount(0);
    const afterFutureDelete = await request().input("id", driverId).query<{ count: number }>("SELECT COUNT(*) AS count FROM driver.VehicleDriverAssignment WHERE DriverId=@id");
    expect(afterFutureDelete.recordset[0].count).toBe(1);

    // A current assignment (not only a future one) can also be deleted outright.
    // Open-ended (no "to"), same as the very first assignment: the future one
    // above is already gone, so nothing left on this vehicle can overlap it.
    await page.getByText("تخصیص جدید", { exact: true }).click();
    const extraAssign = page.getByRole("form", { name: "ثبت تخصیص", exact: true });
    await selectSearchableOption(extraAssign, "خودرو", token, token);
    await extraAssign.getByRole("button", { name: "تاریخ شروع (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ شروع (شمسی)" }), 1405, "فروردین", "۱");
    await extraAssign.getByLabel("ساعت شروع (تهران)", { exact: true }).selectOption("08");
    await extraAssign.getByRole("button", { name: "ثبت تخصیص", exact: true }).click();
    await expect(current).toContainText(vehicleCode);
    await current.getByRole("button", { name: /^حذف تخصیص/ }).click();
    const deleteCurrentDialog = page.getByRole("dialog", { name: "حذف تخصیص", exact: true });
    await deleteCurrentDialog.getByRole("button", { name: "حذف تخصیص", exact: true }).click();
    await expect(current).toContainText("تخصیص جاری ندارد");
    const afterCurrentDelete = await request().input("id", driverId).query<{ count: number }>("SELECT COUNT(*) AS count FROM driver.VehicleDriverAssignment WHERE DriverId=@id");
    expect(afterCurrentDelete.recordset[0].count).toBe(1);
  });
  test("shows overlap conflict, keeps input and preserves focus during live search", async ({ page }) => {
    await page.goto(`/drivers/${driverId}`);
    await page.getByText("تخصیص جدید", { exact: true }).click();
    const assign = page.getByRole("form", { name: "ثبت تخصیص", exact: true });
    await selectSearchableOption(assign, "خودرو", token, token);
    await assign.getByRole("button", { name: "تاریخ شروع (شمسی)", exact: true }).click();
    await selectJalaliDate(page.getByRole("dialog", { name: "انتخاب تاریخ شروع (شمسی)" }), 1404, "فروردین", "۱");
    await assign.getByLabel("ساعت شروع (تهران)", { exact: true }).selectOption("09");
    // The hour reads in Persian numerals while the submitted value stays HH:mm.
    await expect(assign.getByLabel("ساعت شروع (تهران)", { exact: true })).toContainText("۰۹");
    await assign.getByRole("button", { name: "ثبت تخصیص", exact: true }).click();
    await expect(assign.getByRole("alert")).toContainText("راننده در این بازه تخصیص دیگری دارد");
    await expect(assign.getByLabel("خودرو", { exact: true })).toContainText(token);
    await expect(assign.getByLabel("ساعت شروع (تهران)", { exact: true })).toHaveValue("09");
    await expect(assign.locator('input[type="hidden"][name="fromTime"]')).toHaveValue("09:00");
    await page.goto("/drivers?page=2&source=e2e");
    const search = page.getByRole("searchbox", { name: "جستجوی رانندگان" });
    await search.fill(token);
    await expect(page).toHaveURL(new RegExp(`search=${token}`));
    await expect(search).toBeFocused();
    expect(new URL(page.url()).searchParams.get("source")).toBe("e2e");
    expect(new URL(page.url()).searchParams.has("page")).toBe(false);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.screenshot({ path: "test-results/drivers-list-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("main li").filter({ hasText: token })).toBeVisible();
    expect(await page.locator("main").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
  test("confirms a license by human-readable identity and deletes it", async ({ page }) => {
    await page.goto(`/drivers/${driverId}`);
    await page.getByRole("button", { name: "حذف گواهینامه Heavy Edited" }).click();
    const dialog = page.getByRole("dialog", { name: "حذف گواهینامه" });
    await expect(dialog).toContainText("گواهینامه Heavy Edited");
    await expect(dialog).toContainText(token);
    await dialog.getByRole("button", { name: "حذف گواهینامه", exact: true }).click();
    await expect(page.getByText("گواهینامه‌ای ثبت نشده", { exact: true })).toBeVisible();
    const remaining = await request().input("id", driverId).query<{ count: number }>("SELECT COUNT(*) AS count FROM driver.DriverLicense WHERE DriverId=@id");
    expect(remaining.recordset[0].count).toBe(0);
  });
});
