import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe("Repair cost summary", () => {
  const token = `E2E-COST-${randomUUID().slice(0, 8)}`;
  let adapter: E2EDatabaseAdapter;
  test.beforeAll(async () => { test.setTimeout(60000); adapter = await connectToE2EDatabase(); });
  test.afterAll(async () => {
    test.setTimeout(90000);
    try { if (adapter) {
      const result = await adapter.underlyingDriver().request().input("token", token).query<{ remaining: number }>(`
        DELETE item FROM maintenance.WorkOrderPart item JOIN maintenance.WorkOrder o ON o.WorkOrderId=item.WorkOrderId JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
        DELETE task FROM maintenance.WorkOrderTask task JOIN maintenance.WorkOrder o ON o.WorkOrderId=task.WorkOrderId JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
        DELETE o FROM maintenance.WorkOrder o JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
        DELETE inventory.Part WHERE PartCode=@token; DELETE inventory.Unit WHERE UnitName=@token;
        DELETE fleet.Vehicle WHERE VehicleCode=@token; DELETE fleet.VehicleModel WHERE ModelName=@token;
        DELETE fleet.VehicleBrand WHERE BrandName=@token; DELETE fleet.VehicleStatus WHERE StatusName=@token;
        DELETE maintenance.MaintenanceType WHERE TypeCode=@token;
        SELECT COUNT(*) remaining FROM fleet.Vehicle WHERE VehicleCode=@token;
      `); expect(result.recordset[0].remaining).toBe(0);
    } } finally { await adapter?.dispose(); }
  });
  test("shows an incomplete exact total and refreshes it after completing both missing source amounts", async ({ page }) => {
    test.setTimeout(180000);
    await page.goto("/maintenance/catalogs/create");
    await page.getByLabel("کد نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/);
    const typeId = Number(new URL(page.url()).pathname.split("/").at(-1));
    const fixture = await adapter.underlyingDriver().request().input("token", token).input("type", typeId).query<{ id: number; emptyId: number }>(`
      DECLARE @brand int,@model int,@status int,@vehicle int,@unit int,@part int,@order int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,ModelId,VehicleStatusId) VALUES (@token,N'12',@model,@status); SET @vehicle=SCOPE_IDENTITY();
      INSERT inventory.Unit (UnitName) VALUES (@token); SET @unit=SCOPE_IDENTITY();
      INSERT inventory.Part (PartCode,PartName,UnitId) VALUES (@token,@token,@unit); SET @part=SCOPE_IDENTITY();
      INSERT maintenance.WorkOrder (WorkOrderNo,VehicleId,MaintenanceTypeId,WorkLocationType,Status,ActualStartDateTime,ActualEndDateTime,FinalDescription)
        VALUES (@token,@vehicle,@type,N'OnSite',N'Completed',DATEADD(minute,-10,SYSDATETIME()),DATEADD(minute,-5,SYSDATETIME()),@token); SET @order=SCOPE_IDENTITY();
      INSERT maintenance.WorkOrderTask (WorkOrderId,TaskTitle,Status,LaborCost) VALUES (@order,@token+N' کار لغوشده',N'Cancelled',12.34),(@order,@token+N' کار تکمیل‌شده',N'Completed',NULL);
      INSERT maintenance.WorkOrderPart (WorkOrderId,PartId,Quantity,UnitPrice) VALUES (@order,@part,1.01,2.03),(@order,@part,10,NULL);
      INSERT maintenance.WorkOrder (WorkOrderNo,VehicleId,MaintenanceTypeId,WorkLocationType,Status) VALUES (@token+N'-empty',@vehicle,@type,N'OnSite',N'Open');
      SELECT @order id,CONVERT(int,SCOPE_IDENTITY()) emptyId;
    `); const id = fixture.recordset[0].id;
    const panel = page.locator("[data-loading-panel]");
    await page.goto(`/maintenance/work-orders/${fixture.recordset[0].emptyId}`);
    const sidebar = page.getByRole("complementary", { name: "خلاصهٔ پرونده" });
    await expect(sidebar.getByRole("heading", { name: "اقدام بعدی", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("region", { name: "خلاصهٔ هزینه‌ها" })).toHaveCount(0);
    await page.getByRole("link", { name: "کارها و اجرت", exact: true }).click();
    await page.getByRole("button", { name: "ثبت کار", exact: true }).click();
    const taskCreation = page.getByRole("dialog", { name: "ثبت کار", exact: true });
    await expect(taskCreation).toBeVisible(); await taskCreation.getByRole("button", { name: "انصراف", exact: true }).click();
    await page.getByRole("link", { name: "قطعات مصرف‌شده", exact: true }).click();
    await page.getByRole("button", { name: "ثبت قطعهٔ مصرف‌شده", exact: true }).click();
    const partCreation = page.getByRole("dialog", { name: "ثبت قطعهٔ مصرف‌شده", exact: true });
    await expect(partCreation).toBeVisible(); await partCreation.getByRole("button", { name: "انصراف", exact: true }).click();
    await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded(); await captureResponsiveThemes(page, "repair-sidebar-empty");
    await page.goto(`/maintenance/work-orders/${id}/costs`);
    await expect(page.getByRole("link", { name: "نتیجه و هزینه‌ها", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(panel.getByText("14.3903", { exact: true })).toBeVisible();
    await expect(sidebar.getByRole("link")).toHaveCount(0);
    expect(await panel.getByText("14.3903", { exact: true }).evaluate(element => Number(getComputedStyle(element).fontWeight))).toBeGreaterThanOrEqual(700);
    expect(await sidebar.getByText("14.3903", { exact: true }).evaluate(element => Number(getComputedStyle(element).fontWeight))).toBeGreaterThanOrEqual(700);
    await expect(panel.getByText("هزینه‌ها کامل نیست", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByRole("region", { name: "عملیات پرونده" })).toHaveCount(0);
    await panel.getByRole("link", { name: "بررسی اجرت کارها", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/${id}/tasks$`));
    await page.getByRole("button", { name: `تکمیل اجرت کار ${token} کار تکمیل‌شده`, exact: true }).click();
    let dialog = page.getByRole("dialog", { name: "تکمیل اجرت کار", exact: true });
    await dialog.getByLabel("اجرت کار (تومان)", { exact: true }).fill("5.10");
    await dialog.getByRole("button", { name: "ثبت اجرت", exact: true }).click(); await expect(dialog).toBeHidden();
    await page.getByRole("link", { name: "نتیجه و هزینه‌ها", exact: true }).click();
    await expect(panel.getByText("19.4903", { exact: true })).toBeVisible();
    await expect(panel.getByText("هزینه‌ها کامل نیست", { exact: true })).toBeVisible();
    await panel.getByRole("link", { name: "بررسی قیمت قطعات", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/${id}/parts$`));
    await page.getByRole("button", { name: `تکمیل قیمت ${token}`, exact: true }).click();
    dialog = page.getByRole("dialog", { name: "تکمیل قیمت قطعه", exact: true });
    await dialog.getByLabel("قیمت هر واحد (تومان)", { exact: true }).fill("0.01");
    await dialog.getByRole("button", { name: "ثبت قیمت", exact: true }).click(); await expect(dialog).toBeHidden();
    await page.getByRole("link", { name: "نتیجه و هزینه‌ها", exact: true }).click();
    await expect(panel.getByText("19.5903", { exact: true })).toBeVisible();
    await expect(panel.getByText("همهٔ مبلغ‌ها مشخص است", { exact: true })).toBeVisible();
    await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
    await captureResponsiveThemes(page, "repair-costs-complete");
    await page.setViewportSize({ width: 390, height: 844 });
    const navigation = page.getByRole("navigation", { name: "بخش‌های پروندهٔ تعمیر", exact: true });
    const bounds = (await navigation.boundingBox())!;
    for (const link of await navigation.getByRole("link").all()) {
      const box = (await link.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    }
  });
});
