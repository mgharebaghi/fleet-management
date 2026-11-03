import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe.serial("Maintenance requests", () => {
  const token = `E2E-R-${randomUUID().slice(0, 10)}`;
  let adapter: E2EDatabaseAdapter, vehicleId: number, typeId: number;
  let unlinkedRequestId: number, linkedRequestId: number;
  test.beforeAll(async () => {
    test.setTimeout(60000); adapter = await connectToE2EDatabase();
    const result = await adapter.underlyingDriver().request().input("token", token).query<{ id: number }>(`
      DECLARE @brand int,@model int,@status int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,PlateNoCenterChar,PlateNoRightSide,PlateNoIranNo,ModelId,VehicleStatusId,CurrentOdometer) VALUES (@token,N'12',N'الف',N'345',N'67',@model,@status,100.01);
      SELECT CONVERT(int,SCOPE_IDENTITY()) id;
    `); vehicleId = result.recordset[0].id;
  });
  test.afterAll(async () => {
    test.setTimeout(60000);
    try { if (adapter) {
      const result = await adapter.underlyingDriver().request().input("token", token).query<{ remaining: number }>(`
        DELETE o FROM maintenance.WorkOrder o JOIN maintenance.MaintenanceRequest r ON r.MaintenanceRequestId=o.MaintenanceRequestId JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE v.VehicleCode=@token;
        DELETE r FROM maintenance.MaintenanceRequest r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE v.VehicleCode=@token;
        DELETE fleet.Vehicle WHERE VehicleCode=@token;
        DELETE fleet.VehicleModel WHERE ModelName=@token;
        DELETE fleet.VehicleBrand WHERE BrandName=@token;
        DELETE fleet.VehicleStatus WHERE StatusName=@token;
        DELETE maintenance.MaintenanceType WHERE TypeCode=@token;
        SELECT COUNT(*) remaining FROM fleet.Vehicle WHERE VehicleCode=@token;
      `); expect(result.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });
  async function selectReferences(page: Page) {
    await page.getByLabel("خودرو", { exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "جستجوی خودرو", exact: true });
    await dialog.getByRole("combobox").fill(token);
    const option = dialog.getByRole("option", { name: token });
    const plateBounds = await option.locator('span[dir="ltr"]').boundingBox(), optionBounds = await option.boundingBox();
    expect(plateBounds?.width).toBeLessThan(240); expect(plateBounds?.height).toBeLessThan(40);
    expect(plateBounds!.width).toBeLessThan(optionBounds!.width * 0.85);
    await option.click();
    await selectSearchableOption(page, "نوع تعمیر و سرویس", token, token);
  }
  async function confirmStatus(page: Page, label: string) {
    await page.getByRole("button", { name: label, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: label, exact: true });
    await dialog.getByRole("button", { name: "تأیید", exact: true }).click();
    return dialog;
  }
  async function chooseHours(page: Page, hours: string, minutes: string) {
    await page.getByLabel("ساعت کارکرد گزارش‌شده", { exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "انتخاب ساعت کارکرد گزارش‌شده", exact: true });
    await dialog.getByLabel("ساعت", { exact: true }).fill(hours);
    await dialog.getByLabel("دقیقه", { exact: true }).selectOption(minutes);
    await dialog.getByRole("button", { name: "انتخاب کارکرد", exact: true }).click();
  }
  test("registers, edits, tracks and cancels a request without changing the vehicle meter", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/maintenance/catalogs/create");
    await page.getByLabel("کد نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/); typeId = Number(new URL(page.url()).pathname.split("/").at(-1));
    await page.goto("/maintenance/requests/create");
    await captureResponsiveThemes(page, "maintenance-request-form");
    await page.getByRole("button", { name: "ثبت درخواست تعمیر", exact: true }).click();
    await expect(page.getByLabel("خودرو", { exact: true })).toHaveAttribute("data-invalid", "true");
    await selectReferences(page);
    await expect(page.getByLabel("خودرو", { exact: true })).not.toHaveAttribute("data-invalid", "true");
    await page.getByLabel("شرح مشکل یا نیاز به سرویس", { exact: true }).fill(`${token} صدای غیرعادی موتور`);
    await selectSearchableOption(page, "اولویت", "فوری", "فوری");
    await page.getByLabel("اولویت", { exact: true }).click();
    const priorities = page.getByRole("dialog", { name: "جستجوی اولویت", exact: true });
    await priorities.getByRole("combobox").fill("ویژه");
    await priorities.getByRole("button", { name: "استفاده از اولویت جدید: «ویژه»", exact: true }).click();
    await page.getByLabel("کیلومتر گزارش‌شده", { exact: true }).pressSequentially("1234567.89");
    await expect(page.getByLabel("کیلومتر گزارش‌شده", { exact: true })).toHaveValue("1,234,567.89");
    await expect(page.locator('input[name="reportedOdometer"]')).toHaveValue("1234567.89");
    await page.getByLabel("کیلومتر گزارش‌شده", { exact: true }).fill("-1");
    await page.getByRole("button", { name: "ثبت درخواست تعمیر", exact: true }).click();
    await expect(page.getByLabel("کیلومتر گزارش‌شده", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("کیلومتر گزارش‌شده", { exact: true }).fill("۱۲۳۴.۵۶");
    await expect(page.getByLabel("کیلومتر گزارش‌شده", { exact: true })).toHaveAttribute("aria-invalid", "false");
    await expect(page.locator('input[name="priority"]')).toHaveValue("ویژه");
    await chooseHours(page, "25", "10");
    await expect(page.getByLabel("ساعت کارکرد گزارش‌شده", { exact: true })).toContainText("25:10:12");
    await expect(page.locator('input[name="reportedEngineHours"]')).toHaveValue("25.17");
    await chooseHours(page, "25", "06");
    await expect(page.getByLabel("ساعت کارکرد گزارش‌شده", { exact: true })).toContainText("25:06");
    await page.getByLabel("ساعت کارکرد گزارش‌شده", { exact: true }).click();
    const durationDialog = page.getByRole("dialog", { name: "انتخاب ساعت کارکرد گزارش‌شده", exact: true });
    await durationDialog.getByLabel("ساعت", { exact: true }).press("Enter");
    await expect(durationDialog).toBeHidden();
    await expect(page).toHaveURL(/\/maintenance\/requests\/create$/);
    await expect(page.locator('input[name="reportedEngineHours"]')).toHaveValue("25.10");
    await expect(page.locator('input[name="vehicleId"]')).toHaveValue(String(vehicleId));
    await expect(page.locator('input[name="maintenanceTypeId"]')).toHaveValue(String(typeId));
    await captureResponsiveThemes(page, "maintenance-request-filled-form");
    await page.getByRole("button", { name: "ثبت درخواست تعمیر", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/requests$/);
    await page.getByRole("row").filter({ hasText: token }).getByRole("link", { name: /^مشاهدهٔ درخواست/ }).click();
    await expect(page).toHaveURL(/\/maintenance\/requests\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").at(-1));
    unlinkedRequestId = id;
    await expect(page.getByText("1,234.56", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "ویرایش درخواست", exact: true }).click();
    await page.getByLabel("ساعت کارکرد گزارش‌شده", { exact: true }).click();
    await page.getByRole("dialog", { name: "انتخاب ساعت کارکرد گزارش‌شده", exact: true }).getByRole("button", { name: "انتخاب کارکرد", exact: true }).click();
    await expect(page.locator('input[name="reportedEngineHours"]')).toHaveValue("25.10");
    await page.getByLabel("یادداشت تکمیلی", { exact: true }).fill("برای بررسی ارجاع شود");
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/requests/${id}$`));
    await page.getByRole("heading", { name: `درخواست تعمیر ${id}`, exact: true }).scrollIntoViewIfNeeded();
    await captureResponsiveThemes(page, "maintenance-request-detail");
    await page.getByRole("heading", { name: "پیگیری درخواست", exact: true }).scrollIntoViewIfNeeded();
    await captureResponsiveThemes(page, "maintenance-request-detail-actions");
    await page.goto(`/maintenance/requests?search=${token}`);
    await captureResponsiveThemes(page, "maintenance-request-row-actions");
    const cancelButton = page.getByRole("button", { name: `لغو درخواست — درخواست ${id}`, exact: true });
    await expect(cancelButton).toBeInViewport();
    await expect(page.getByRole("button", { name: `حذف درخواست ${id}`, exact: true })).toBeInViewport();
    await expect(cancelButton).toHaveAttribute("title", `لغو درخواست — درخواست ${id}`);
    const activeRow = page.getByRole("row").filter({ has: page.getByRole("link", { name: `مشاهدهٔ درخواست ${id}`, exact: true }) });
    await expect(activeRow.getByRole("button")).toHaveCount(2);
    await expect(activeRow.getByRole("link")).toHaveCount(2);
    const cancelBounds = await cancelButton.boundingBox();
    const deleteBounds = await page.getByRole("button", { name: `حذف درخواست ${id}`, exact: true }).boundingBox();
    expect(Math.abs(cancelBounds!.y - deleteBounds!.y)).toBeLessThan(1);
    for (const name of [`مشاهدهٔ درخواست ${id}`, `ویرایش درخواست ${id}`]) {
      const bounds = await activeRow.getByRole("link", { name, exact: true }).boundingBox();
      expect(Math.abs(cancelBounds!.y - bounds!.y)).toBeLessThan(1);
    }
    await cancelButton.click();
    await page.getByRole("dialog", { name: "لغو درخواست", exact: true }).getByRole("button", { name: "انصراف", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    const activeCard = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `مشاهدهٔ درخواست ${id}`, exact: true }) });
    await expect(activeCard.getByRole("button")).toHaveCount(2);
    await expect(activeCard.getByRole("link")).toHaveCount(2);
    const mobileCancel = await activeCard.getByRole("button", { name: `لغو درخواست — درخواست ${id}`, exact: true }).boundingBox();
    const mobileDelete = await activeCard.getByRole("button", { name: `حذف درخواست ${id}`, exact: true }).boundingBox();
    expect(Math.abs(mobileCancel!.y - mobileDelete!.y)).toBeLessThan(1);
    for (const name of [`مشاهدهٔ درخواست ${id}`, `ویرایش درخواست ${id}`]) {
      const bounds = await activeCard.getByRole("link", { name, exact: true }).boundingBox();
      expect(Math.abs(mobileCancel!.y - bounds!.y)).toBeLessThan(1);
    }
    await activeCard.getByRole("link", { name: `مشاهدهٔ درخواست ${id}`, exact: true }).click();
    await expect(await confirmStatus(page, "شروع پیگیری")).toBeHidden();
    await expect(page.getByText("در حال پیگیری", { exact: true })).toBeVisible();
    await page.goto(`/maintenance/requests?search=${token}`);
    await page.getByRole("button", { name: `لغو درخواست — درخواست ${id}`, exact: true }).click();
    const cancelDialog = page.getByRole("dialog", { name: "لغو درخواست", exact: true });
    await cancelDialog.getByRole("button", { name: "تأیید", exact: true }).click();
    await expect(cancelDialog).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`/maintenance/requests\\?search=${token}$`));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/maintenance/requests/${id}`);
    await expect(page.getByText("لغوشده", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "بستن درخواست", exact: true })).toHaveCount(0);
    await page.goto(`/maintenance/requests/${id}/edit`);
    await expect(page.getByRole("heading", { name: "این درخواست قابل ویرایش نیست", exact: true })).toBeVisible();
    const result = await adapter.underlyingDriver().request().input("vehicle", vehicleId).input("id", id).query<{ Status: string; reading: string; current: string; history: number; Priority: string; hours: string }>(`
      SELECT r.Status,r.Priority,CONVERT(varchar(40),r.ReportedEngineHour) hours,CONVERT(varchar(40),r.ReportedOdometer) reading,CONVERT(varchar(40),v.CurrentOdometer) [current],(SELECT COUNT(*) FROM fleet.VehicleMeterReading WHERE VehicleId=@vehicle) history
      FROM maintenance.MaintenanceRequest r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE r.MaintenanceRequestId=@id;
    `); expect(result.recordset).toEqual([{ Status: "Cancelled", Priority: "ویژه", hours: "25.10", reading: "1234.56", current: "100.01", history: 0 }]);
  });
  test("locks linked request operations and derives follow-up status from repair files", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/maintenance/requests/create"); await selectReferences(page);
    await page.getByLabel("شرح مشکل یا نیاز به سرویس", { exact: true }).fill(`${token} سرویس مرتبط`);
    await page.getByRole("button", { name: "ثبت درخواست تعمیر", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/requests$/);
    await page.getByRole("row").filter({ hasText: token }).first().getByRole("link", { name: /^مشاهدهٔ درخواست/ }).click();
    await expect(page).toHaveURL(/\/maintenance\/requests\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").at(-1));
    linkedRequestId = id;
    await adapter.underlyingDriver().request().input("vehicle", vehicleId).input("type", typeId).input("request", id).input("number", token).query("INSERT maintenance.WorkOrder (VehicleId,MaintenanceTypeId,MaintenanceRequestId,WorkOrderNo,WorkLocationType,Status) VALUES (@vehicle,@type,@request,@number,N'OnSite',N'Open')");
    await page.reload();
    await expect(page.getByRole("button", { name: "بستن درخواست", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "لغو درخواست", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "ویرایش درخواست", exact: true })).toHaveCount(0);
    await expect(page.getByText("در انتظار تعمیر", { exact: true })).toBeVisible();
    await page.goto(`/maintenance/requests/${id}/edit`);
    await expect(page.getByRole("heading", { name: "این درخواست قابل ویرایش نیست", exact: true })).toBeVisible();
    await adapter.underlyingDriver().request().input("request", id).query("UPDATE maintenance.WorkOrder SET Status=N'Completed',ActualStartDateTime=DATEADD(minute,-5,SYSDATETIME()),ActualEndDateTime=SYSDATETIME(),FinalDescription=N'Completed fixture' WHERE MaintenanceRequestId=@request");
    await page.goto(`/maintenance/requests/${id}`);
    await expect(page.getByRole("complementary", { name: "پیگیری درخواست" }).getByText("تعمیر انجام‌شده", { exact: true })).toBeVisible();
    await page.goto(`/maintenance/requests?search=${token}&keep=1`);
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(2);
    await expect(page.getByRole("button", { name: /^(شروع پیگیری|بستن درخواست|لغو درخواست) — درخواست/ })).toHaveCount(0);
    await captureResponsiveThemes(page, "maintenance-requests-list");
    await page.getByLabel("وضعیت رسیدگی", { exact: true }).selectOption("RepairCompleted");
    await expect(page).toHaveURL(/status=RepairCompleted/);
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(1);
    await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/requests\?keep=1$/);
    await expect(page.getByRole("link", { name: "پاک کردن فیلترها", exact: true })).toHaveCount(0);
  });
  test("deletes unlinked requests from mobile cards and rechecks references after a stale list", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto(`/maintenance/requests?search=${token}`);
    const unused = page.getByRole("row").filter({ has: page.getByRole("link", { name: `مشاهدهٔ درخواست ${unlinkedRequestId}`, exact: true }) });
    const linked = page.getByRole("row").filter({ has: page.getByRole("link", { name: `مشاهدهٔ درخواست ${linkedRequestId}`, exact: true }) });
    await expect(linked.getByRole("button", { name: /^حذف درخواست.*امکان‌پذیر نیست/ })).toBeDisabled();
    await unused.getByRole("button", { name: /^حذف درخواست \d+$/ }).click();
    let dialog = page.getByRole("dialog", { name: "حذف درخواست تعمیر", exact: true });
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    await expect(unused).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: `مشاهدهٔ درخواست ${unlinkedRequestId}`, exact: true }) });
    await card.getByRole("button", { name: /^حذف درخواست \d+$/ }).click();
    dialog = page.getByRole("dialog", { name: "حذف درخواست تعمیر", exact: true });
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(card).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/maintenance/requests\\?search=${token}$`));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/maintenance/requests/create"); await selectReferences(page);
    await page.getByLabel("شرح مشکل یا نیاز به سرویس", { exact: true }).fill(`${token} stale-delete`);
    await page.getByRole("button", { name: "ثبت درخواست تعمیر", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/requests$/);
    const row = page.getByRole("row").filter({ hasText: token }).first();
    const href = await row.getByRole("link", { name: /^مشاهدهٔ درخواست/ }).getAttribute("href");
    const id = Number(href!.split("/").at(-1));
    await expect(row.getByRole("button", { name: `حذف درخواست ${id}`, exact: true })).toBeEnabled();
    await adapter.underlyingDriver().request().input("vehicle", vehicleId).input("type", typeId).input("request", id).input("number", `${token}-stale`).query("INSERT maintenance.WorkOrder (VehicleId,MaintenanceTypeId,MaintenanceRequestId,WorkOrderNo,WorkLocationType,Status) VALUES (@vehicle,@type,@request,@number,N'OnSite',N'Cancelled')");
    await row.getByRole("button", { name: `حذف درخواست ${id}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "حذف درخواست تعمیر", exact: true });
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("پروندهٔ تعمیر دارد و قابل تغییر یا حذف نیست");
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    await page.reload();
    await expect(row.getByRole("button", { name: /^حذف درخواست.*امکان‌پذیر نیست/ })).toBeDisabled();
  });
});
