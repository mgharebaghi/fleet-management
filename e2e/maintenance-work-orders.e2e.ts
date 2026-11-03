import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { captureResponsiveThemes } from "./support/visual-evidence";
test.describe.serial("Work-order preparation", () => {
  const token = `E2E-WO-${randomUUID().slice(0, 8)}`;
  let adapter: E2EDatabaseAdapter, vehicleId: number, typeId: number, requestId: number, planId: number;
  test.beforeAll(async () => {
    test.setTimeout(60000); adapter = await connectToE2EDatabase();
    const result = await adapter.underlyingDriver().request().input("token", token).query<{ id: number }>(`
      DECLARE @brand int,@model int,@status int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,PlateNoCenterChar,PlateNoRightSide,PlateNoIranNo,ModelId,VehicleStatusId,CurrentOdometer,CurrentEngineHour) VALUES (@token,N'12',N'الف',N'345',N'67',@model,@status,100.01,2.01);
      SELECT CONVERT(int,SCOPE_IDENTITY()) id;
    `); vehicleId = result.recordset[0].id;
  });
  test.afterAll(async () => {
    test.setTimeout(90000);
    try { if (adapter) {
      const result = await adapter.underlyingDriver().request().input("token", token).query<{ remaining: number }>(`
        DELETE task FROM maintenance.WorkOrderTask task JOIN maintenance.WorkOrder o ON o.WorkOrderId=task.WorkOrderId JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
        DELETE o FROM maintenance.WorkOrder o JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
        DELETE r FROM maintenance.MaintenanceRequest r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE v.VehicleCode=@token;
        DELETE p FROM maintenance.MaintenancePlan p JOIN fleet.Vehicle v ON v.VehicleId=p.VehicleId WHERE v.VehicleCode=@token;
        DELETE maintenance.Workshop WHERE WorkshopName=@token;
        DELETE maintenance.Technician WHERE FirstName=@token;
        DELETE fleet.Vehicle WHERE VehicleCode=@token; DELETE fleet.VehicleModel WHERE ModelName=@token;
        DELETE fleet.VehicleBrand WHERE BrandName=@token; DELETE fleet.VehicleStatus WHERE StatusName=@token;
        DELETE maintenance.MaintenanceType WHERE TypeCode=@token;
        SELECT COUNT(*) remaining FROM fleet.Vehicle WHERE VehicleCode=@token;
      `); expect(result.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });
  async function openLatest(page: Page) {
    const row = page.getByRole("row").filter({ hasText: token }).first();
    await row.getByRole("link", { name: /^مشاهدهٔ پرونده$/ }).click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders\/\d+$/, { timeout: 45000 });
    return Number(new URL(page.url()).pathname.split("/").at(-1));
  }
  test("prepares an order from a request, retains failed-form input and edits diagnosis without starting repair", async ({ page }) => {
    test.setTimeout(240000);
    await page.goto("/maintenance/catalogs/create");
    await page.getByLabel("کد نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/); typeId = Number(new URL(page.url()).pathname.split("/").at(-1));
    const fixture = await adapter.underlyingDriver().request().input("token", token).input("vehicle", vehicleId).input("type", typeId).query<{ requestId: number; planId: number }>(`
      INSERT maintenance.Workshop (WorkshopName,WorkshopType) VALUES (@token,N'General');
      INSERT maintenance.MaintenanceRequest (VehicleId,MaintenanceTypeId,ProblemDescription,ReportedOdometer,ReportedEngineHour,Status) VALUES (@vehicle,@type,@token,123456.78,25.10,N'Open');
      DECLARE @request int=SCOPE_IDENTITY();
      INSERT maintenance.MaintenancePlan (VehicleId,MaintenanceTypeId,PlanTitle,IntervalKm,LastServiceOdometer) VALUES (@vehicle,@type,@token,500,10.01);
      SELECT @request requestId,CONVERT(int,SCOPE_IDENTITY()) planId;
    `); requestId = fixture.recordset[0].requestId; planId = fixture.recordset[0].planId;
    await page.goto(`/maintenance/requests/${requestId}`);
    await page.getByRole("link", { name: "ثبت پروندهٔ تعمیر", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/create\\?requestId=${requestId}$`));
    await expect(page.getByLabel("خودرو", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("نوع تعمیر و سرویس", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("کیلومتر ثبت‌شده در پرونده", { exact: true })).toHaveValue("123,456.78");
    await page.getByLabel("محل انجام تعمیر", { exact: true }).selectOption("Workshop");
    await page.getByLabel("عیب‌یابی اولیه", { exact: true }).fill(`${token} بررسی اولیه`);
    await captureResponsiveThemes(page, "work-order-form");
    await page.getByRole("button", { name: "ثبت پروندهٔ تعمیر", exact: true }).click();
    await expect(page.getByLabel("تعمیرگاه", { exact: true })).toHaveAttribute("data-invalid", "true");
    await expect(page.locator('input[name="vehicleId"]')).toHaveValue(String(vehicleId));
    await expect(page.locator('input[name="sourceId"]')).toHaveValue(String(requestId));
    await expect(page.getByLabel("عیب‌یابی اولیه", { exact: true })).toHaveValue(`${token} بررسی اولیه`);
    await selectSearchableOption(page, "تعمیرگاه", token, token);
    await expect(page.getByLabel("تعمیرگاه", { exact: true })).not.toHaveAttribute("data-invalid", "true");
    await page.getByLabel("کیلومتر ثبت‌شده در پرونده", { exact: true }).fill("۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹");
    await page.getByRole("button", { name: "ثبت پروندهٔ تعمیر", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
    const id = await openLatest(page);
    await expect(page.getByText("ثبت‌شده", { exact: true })).toBeVisible();
    await expect(page.getByText("9,999,999,999,999,999.99", { exact: true })).toBeVisible();
    await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" })).toBeVisible();
    await page.getByRole("link", { name: "کارها و اجرت", exact: true }).click();
    await page.getByRole("button", { name: "ثبت کار", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "ثبت کار", exact: true })).toBeVisible();
    await page.getByRole("dialog", { name: "ثبت کار", exact: true }).getByRole("button", { name: "انصراف", exact: true }).click();
    await page.getByRole("link", { name: "اطلاعات و عیب‌یابی", exact: true }).click();
    await captureResponsiveThemes(page, "work-order-detail");
    await page.getByRole("link", { name: "ویرایش اطلاعات و عیب‌یابی", exact: true }).click();
    await page.getByLabel("عیب‌یابی اولیه", { exact: true }).fill(`${token} تشخیص اصلاح‌شده`);
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/${id}$`));
    await expect(page.getByText(`${token} تشخیص اصلاح‌شده`, { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "مشاهدهٔ درخواست مرتبط", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/requests/${requestId}$`));
    await expect(page.getByRole("link", { name: /^WO-\d{4}-\d{4}$/ }).first()).toBeVisible();
    await page.goto(`/maintenance/requests?search=${token}`);
    await expect(page.getByRole("button", { name: /^حذف درخواست.*پروندهٔ تعمیر دارد/ })).toBeDisabled();
    const result = await adapter.underlyingDriver().request().input("id", id).query<{ status: string; requestStatus: string; odometer: string; engineHours: string; current: string; history: number; started: unknown }>(`
      SELECT o.Status status,r.Status requestStatus,CONVERT(varchar(40),o.Odometer) odometer,CONVERT(varchar(40),o.EngineHour) engineHours,
      CONVERT(varchar(40),v.CurrentOdometer) [current],o.ActualStartDateTime started,(SELECT COUNT(*) FROM fleet.VehicleMeterReading WHERE VehicleId=v.VehicleId) history
      FROM maintenance.WorkOrder o JOIN maintenance.MaintenanceRequest r ON r.MaintenanceRequestId=o.MaintenanceRequestId JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE o.WorkOrderId=@id;
    `); expect(result.recordset).toEqual([{ status: "Open", requestStatus: "Open", odometer: "9999999999999999.99", engineHours: "25.10", current: "100.01", history: 0, started: null }]);
  });
  test("supports direct and service origins, shared list filters, mobile navigation and closed-file protection", async ({ page }) => {
    test.setTimeout(240000);
    await page.goto("/maintenance/work-orders/create");
    await selectSearchableOption(page, "خودرو", token, token);
    await selectSearchableOption(page, "نوع تعمیر و سرویس", token, token);
    await page.getByLabel("شرح مشکل یا نیاز به سرویس", { exact: true }).fill(`${token} ثبت مستقیم`);
    await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
    await captureResponsiveThemes(page, "work-order-direct-form");
    await page.getByRole("button", { name: "ثبت پروندهٔ تعمیر", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
    const directId = await openLatest(page);
    await expect(page.getByText("ثبت مستقیم", { exact: true })).toBeVisible();
    await page.goto(`/maintenance/work-orders/create?planId=${planId}`);
    await expect(page.locator('input[name="odometer"]')).toHaveValue("");
    await expect(page.locator('input[name="engineHours"]')).toHaveValue("");
    await expect(page.getByLabel("خودرو", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "ثبت پروندهٔ تعمیر", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
    const planOrderId = await openLatest(page);
    await expect(page.getByText("برنامهٔ سرویس", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: token, exact: true })).toBeVisible();
    await page.goto(`/maintenance/work-orders?search=${token}&keep=1`);
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(3);
    const searchBounds = await page.getByLabel("جستجوی پروندهٔ تعمیر", { exact: true }).boundingBox();
    const statusBounds = await page.getByLabel("وضعیت پرونده", { exact: true }).boundingBox();
    const vehicleBounds = await page.getByLabel("خودرو", { exact: true }).boundingBox();
    expect(Math.abs(searchBounds!.width - statusBounds!.width)).toBeLessThan(2);
    expect(Math.abs(searchBounds!.width - vehicleBounds!.width)).toBeLessThan(2);
    await captureResponsiveThemes(page, "work-order-list");
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileSearch = await page.getByLabel("جستجوی پروندهٔ تعمیر", { exact: true }).boundingBox();
    const mobileVehicle = await page.getByLabel("خودرو", { exact: true }).boundingBox();
    const mobileClear = await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).boundingBox();
    expect(mobileSearch!.width).toBeGreaterThan(300);
    expect(Math.abs(mobileSearch!.width - mobileVehicle!.width)).toBeLessThan(2);
    expect(mobileClear!.y).toBeGreaterThanOrEqual(mobileVehicle!.y + mobileVehicle!.height);
    await page.getByRole("link", { name: /^مشاهدهٔ پرونده$/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/${planOrderId}$`));
    await adapter.underlyingDriver().request().input("id", directId).query("UPDATE maintenance.WorkOrder SET Status=N'Completed' WHERE WorkOrderId=@id");
    await page.goto(`/maintenance/work-orders/${directId}/edit`);
    await expect(page.getByRole("heading", { name: "این پرونده قابل ویرایش نیست", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/maintenance/work-orders?search=${token}&keep=1`);
    await page.getByLabel("وضعیت پرونده", { exact: true }).selectOption("Completed");
    await expect(page).toHaveURL(/status=Completed/); await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^ویرایش پرونده/ })).toHaveCount(0);
    await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/work-orders\?keep=1$/);
    await expect(page.getByRole("link", { name: "پاک کردن فیلترها", exact: true })).toHaveCount(0);
    await page.goto(`/maintenance/work-orders/create?requestId=${requestId}&planId=${planId}`);
    await expect(page.getByRole("heading", { name: "منشأ انتخاب‌شده قابل استفاده نیست", exact: true })).toBeVisible();
  });
  test("manages task preparation, retained labor costs, real execution state and closed-file cost completion", async ({ page }) => {
    test.setTimeout(300000);
    const fixture = await adapter.underlyingDriver().request().input("token", token).input("vehicle", vehicleId).query<{ orderId: number }>(`
      INSERT maintenance.Technician (FirstName,LastName) VALUES (@token,N'Technician');
      SELECT TOP (1) WorkOrderId orderId FROM maintenance.WorkOrder WHERE VehicleId=@vehicle AND Status=N'Open' ORDER BY WorkOrderId DESC;
    `); const orderId = fixture.recordset[0].orderId;
    const firstTitle = `${token} کار اول`, secondTitle = `${token} کار دوم`, thirdTitle = `${token} کار سوم`;
    async function openCreate() { await page.locator("[data-loading-panel]").getByRole("button", { name: "ثبت کار", exact: true }).click(); return page.getByRole("dialog", { name: "ثبت کار", exact: true }); }
    async function chooseDuration(hours: string, minutes: string) {
      await page.getByLabel("مدت کار", { exact: true }).click();
      const duration = page.getByRole("dialog", { name: "انتخاب مدت کار", exact: true });
      await duration.getByLabel("ساعت", { exact: true }).fill(hours); await duration.getByLabel("دقیقه", { exact: true }).selectOption(minutes);
      await duration.getByRole("button", { name: "انتخاب مدت کار", exact: true }).click();
    }
    await page.goto(`/maintenance/work-orders/${orderId}`);
    await page.getByRole("link", { name: "کارها و اجرت", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/${orderId}/tasks$`));
    await expect(page.getByRole("link", { name: "کارها و اجرت", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByRole("region", { name: "عملیات پرونده" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true })).toHaveCount(0);
    let dialog = await openCreate();
    await dialog.getByRole("button", { name: "ثبت کار", exact: true }).click();
    await expect(dialog.getByLabel("عنوان کار", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await dialog.getByLabel("عنوان کار", { exact: true }).fill(firstTitle);
    await expect(dialog.getByLabel("عنوان کار", { exact: true })).toHaveAttribute("aria-invalid", "false");
    await selectSearchableOption(page, "تعمیرکار", token, token);
    await chooseDuration("100000000", "00");
    await dialog.getByRole("button", { name: "ثبت کار", exact: true }).click();
    await expect(dialog.getByLabel("مدت کار", { exact: true })).toHaveAttribute("data-invalid", "true");
    await expect(dialog.getByLabel("عنوان کار", { exact: true })).toHaveValue(firstTitle);
    await expect(dialog.getByLabel("تعمیرکار", { exact: true })).toContainText(token);
    await chooseDuration("2", "30");
    await expect(dialog.locator('option[value="Completed"]')).toBeDisabled();
    await dialog.getByRole("button", { name: "ثبت کار", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: firstTitle })).toContainText("02:30");
    await expect(page.locator("[data-loading-panel]").getByText(/اجرت.*کار مشخص نیست/)).toBeVisible();
    dialog = await openCreate(); await dialog.getByLabel("عنوان کار", { exact: true }).fill(secondTitle);
    await dialog.getByLabel("اجرت کار (تومان)", { exact: true }).fill("۱۲۵۰۰۰۰٫۲۵");
    await expect(dialog.getByLabel("اجرت کار (تومان)", { exact: true })).toHaveValue("1,250,000.25");
    await captureResponsiveThemes(page, "work-task-form", { modal: true });
    await dialog.getByRole("button", { name: "ثبت کار", exact: true }).click(); await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: `لغو کار ${secondTitle}`, exact: true }).click();
    const cancellation = page.getByRole("dialog", { name: "لغو کار", exact: true });
    await cancellation.getByRole("button", { name: "تأیید لغو", exact: true }).click(); await expect(cancellation).toBeHidden();
    const secondRow = page.getByRole("row").filter({ hasText: secondTitle });
    await expect(secondRow).toContainText("لغوشده"); await expect(secondRow).toContainText("1,250,000.25");
    await page.getByRole("button", { name: `ویرایش کار ${firstTitle}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "ویرایش کار", exact: true }); await dialog.getByLabel("اجرت کار (تومان)", { exact: true }).fill("0");
    await dialog.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(page.locator("[data-loading-panel]").getByText("اجرت همهٔ کارها ثبت شده", { exact: true })).toBeVisible();
    await adapter.underlyingDriver().request().input("token", token).input("order", orderId).query("UPDATE maintenance.Technician SET IsActive=0 WHERE FirstName=@token; UPDATE maintenance.WorkOrder SET Status=N'InProgress',ActualStartDateTime=SYSDATETIME() WHERE WorkOrderId=@order;");
    await page.reload(); await page.getByRole("button", { name: `ویرایش کار ${firstTitle}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "ویرایش کار", exact: true }); await dialog.getByLabel("وضعیت کار", { exact: true }).selectOption("Completed");
    await dialog.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: firstTitle })).toContainText("انجام‌شده");
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByRole("region", { name: "خلاصهٔ هزینه‌ها" })).toContainText("1,250,000.25");
    await captureResponsiveThemes(page, "work-task-list");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("link", { name: "اطلاعات و عیب‌یابی", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/${orderId}$`));
    await page.getByRole("link", { name: "کارها و اجرت", exact: true }).click();
    await expect(page.getByRole("listitem").filter({ hasText: firstTitle })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 720 });
    dialog = await openCreate(); await dialog.getByLabel("عنوان کار", { exact: true }).fill(thirdTitle); await dialog.getByLabel("وضعیت کار", { exact: true }).selectOption("Completed");
    await dialog.getByRole("button", { name: "ثبت کار", exact: true }).click(); await expect(dialog).toBeHidden();
    await adapter.underlyingDriver().request().input("order", orderId).query("UPDATE maintenance.WorkOrder SET Status=N'Completed',ActualEndDateTime=SYSDATETIME() WHERE WorkOrderId=@order");
    await page.reload(); await expect(page.getByRole("button", { name: "ثبت کار", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `ویرایش کار ${firstTitle} امکان‌پذیر نیست`, exact: true })).toBeDisabled();
    await page.getByRole("button", { name: `تکمیل اجرت کار ${thirdTitle}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "تکمیل اجرت کار", exact: true });
    await dialog.getByRole("button", { name: "ثبت اجرت", exact: true }).click(); await expect(dialog.getByRole("alert").first()).toBeVisible();
    await dialog.getByLabel("اجرت کار (تومان)", { exact: true }).fill("۵۰۰٫۱۰");
    await dialog.getByRole("button", { name: "ثبت اجرت", exact: true }).click(); await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: `ویرایش کار ${thirdTitle} امکان‌پذیر نیست`, exact: true })).toBeDisabled();
    await expect(page.getByText("1,250,500.35", { exact: true })).toBeVisible();
    const saved = await adapter.underlyingDriver().request().input("order", orderId).query<{ title: string; status: string; hours: string | null; cost: string }>("SELECT TaskTitle title,Status status,CONVERT(varchar(40),LaborHours) hours,CONVERT(varchar(40),LaborCost) cost FROM maintenance.WorkOrderTask WHERE WorkOrderId=@order ORDER BY WorkOrderTaskId");
    expect(saved.recordset).toEqual([{ title: firstTitle, status: "Completed", hours: "2.50", cost: "0.00" }, { title: secondTitle, status: "Cancelled", hours: null, cost: "1250000.25" }, { title: thirdTitle, status: "Completed", hours: null, cost: "500.10" }]);
  });
  test("keeps operations in the sidebar information tab and cancels whole files while retaining tasks and costs", async ({ page }) => {
    test.setTimeout(180000);
    const fixture = await adapter.underlyingDriver().request().input("token", token).input("vehicle", vehicleId).input("type", typeId).input("request", requestId).query<{ id: number; started: number }>(`
      INSERT maintenance.WorkOrder (WorkOrderNo,VehicleId,MaintenanceTypeId,MaintenanceRequestId,WorkLocationType,Status) VALUES (@token+N'-CANCEL-OPEN',@vehicle,@type,@request,N'OnSite',N'Open');
      DECLARE @open int=SCOPE_IDENTITY();
      INSERT maintenance.WorkOrderTask (WorkOrderId,TaskTitle,Status,LaborHours,LaborCost) VALUES (@open,N'Prepared task',N'Open',2.50,123.45);
      INSERT maintenance.WorkOrder (WorkOrderNo,VehicleId,MaintenanceTypeId,MaintenanceRequestId,WorkLocationType,Status,ActualStartDateTime) VALUES (@token+N'-CANCEL-STARTED',@vehicle,@type,@request,N'OnSite',N'InProgress',DATEADD(minute,-5,SYSDATETIME()));
      DECLARE @started int=SCOPE_IDENTITY();
      INSERT maintenance.WorkOrderTask (WorkOrderId,TaskTitle,Status,LaborHours,LaborCost) VALUES (@started,N'Unfinished task',N'InProgress',2.50,123.45),(@started,N'Completed task',N'Completed',1.00,55.10);
      SELECT @open id,0 started UNION ALL SELECT @started id,1 started;
    `);
    for (const order of fixture.recordset) {
      await page.goto(`/maintenance/work-orders/${order.id}`);
      const sidebar = page.getByRole("complementary", { name: "خلاصهٔ پرونده" });
      await expect(sidebar.getByText("وضعیت پرونده", { exact: true })).toBeVisible();
      if (!order.started) await expect(sidebar.getByRole("link", { name: "ویرایش اطلاعات و عیب‌یابی", exact: true })).toBeVisible();
      else await expect(sidebar.getByRole("region", { name: "عملیات پرونده" })).toHaveCount(0);
      await expect(page.getByText("در این بخش اطلاعات اولیه و عیب‌یابی ثبت می‌شوند.", { exact: false })).toHaveCount(0);
      await page.getByRole("link", { name: "کارها و اجرت", exact: true }).click();
      await expect(sidebar.getByRole("link", { name: "ویرایش اطلاعات و عیب‌یابی", exact: true })).toHaveCount(0);
      await expect(sidebar.getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true })).toHaveCount(0);
      await page.getByRole("link", { name: "اطلاعات و عیب‌یابی", exact: true }).click();
      if (order.started) {
        await page.goto(`/maintenance/work-orders/${order.id}/costs`);
        await page.getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true }).click();
      } else await sidebar.getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "لغو پروندهٔ تعمیر", exact: true });
      if (order.started) {
        await dialog.getByRole("button", { name: "تأیید لغو پرونده", exact: true }).click();
        await expect(dialog.getByText("علت توقف تعمیر را وارد کنید.", { exact: true })).toBeVisible();
        await dialog.getByLabel("علت توقف تعمیر", { exact: true }).fill("x".repeat(1001));
        await dialog.getByRole("button", { name: "تأیید لغو پرونده", exact: true }).click();
        await expect(dialog.getByText("مجموع نتیجهٔ قبلی و علت لغو نباید بیشتر از ۱۰۰۰ نویسه باشد.", { exact: true })).toBeVisible();
        await expect(dialog.getByLabel("علت توقف تعمیر", { exact: true })).toHaveValue("x".repeat(1001));
        await dialog.getByLabel("علت توقف تعمیر", { exact: true }).fill("توقف به درخواست مسئول ناوگان");
        await expect(dialog.getByText("علت توقف تعمیر را وارد کنید.", { exact: true })).toHaveCount(0);
      }
      await dialog.getByRole("button", { name: "تأیید لغو پرونده", exact: true }).click(); await expect(dialog).toBeHidden();
      if (order.started) await page.goto(`/maintenance/work-orders/${order.id}`);
      await expect(sidebar.getByText("لغوشده", { exact: true })).toBeVisible();
      await expect(sidebar.getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true })).toHaveCount(0);
      const saved = await adapter.underlyingDriver().request().input("id", order.id).query<{ status: string; ended: Date | null; reason: string | null; requestStatus: string }>(`SELECT o.Status status,o.ActualEndDateTime ended,o.FinalDescription reason,r.Status requestStatus FROM maintenance.WorkOrder o JOIN maintenance.MaintenanceRequest r ON r.MaintenanceRequestId=o.MaintenanceRequestId WHERE o.WorkOrderId=@id`);
      expect(saved.recordset[0]).toMatchObject({ status: "Cancelled", requestStatus: "Open", reason: order.started ? "توقف به درخواست مسئول ناوگان" : null });
      expect(saved.recordset[0].ended !== null).toBe(Boolean(order.started));
      const tasks = await adapter.underlyingDriver().request().input("id", order.id).query<{ status: string; cost: string; hours: string }>("SELECT Status status,CONVERT(varchar(40),LaborCost) cost,CONVERT(varchar(40),LaborHours) hours FROM maintenance.WorkOrderTask WHERE WorkOrderId=@id ORDER BY WorkOrderTaskId");
      expect(tasks.recordset).toEqual(order.started ? [{ status: "Cancelled", cost: "123.45", hours: "2.50" }, { status: "Completed", cost: "55.10", hours: "1.00" }] : [{ status: "Cancelled", cost: "123.45", hours: "2.50" }]);
    }
    await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
    await captureResponsiveThemes(page, "cancelled-work-order-sidebar");
  });

});
