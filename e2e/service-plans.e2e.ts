import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase } from "./support/e2e-database";
import { selectSearchableOption } from "./support/searchable-select";
import { captureResponsiveThemes } from "./support/visual-evidence";
test("creates a due service plan, opens its service file and retains history on deactivation", async ({ page }) => {
  test.setTimeout(240000);
  const token = `E2E-PLAN-${randomUUID().slice(0, 8)}`, adapter = await connectToE2EDatabase();
  try {
    await page.goto("/maintenance/catalogs/create");
    await page.getByLabel("کد نوع تعمیر و سرویس", { exact: true }).fill(token); await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click(); await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/);
    await adapter.underlyingDriver().request().input("token", token).query(`
      DECLARE @brand int,@model int,@status int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,PlateNoCenterChar,PlateNoRightSide,PlateNoIranNo,ModelId,VehicleStatusId,CurrentOdometer) VALUES (@token,N'12',N'الف',N'345',N'67',@model,@status,200.02);
    `);
    await page.goto("/maintenance/plans/create");
    await page.getByLabel("عنوان برنامهٔ سرویس", { exact: true }).fill(token);
    await selectSearchableOption(page, "خودرو", token, token); await selectSearchableOption(page, "نوع تعمیر و سرویس", token, token);
    await expect(page.getByLabel("فاصلهٔ سرویس (کیلومتر)", { exact: true })).toBeHidden();
    await page.getByRole("checkbox", { name: "کیلومتر", exact: true }).check();
    await page.getByLabel("فاصلهٔ سرویس (کیلومتر)", { exact: true }).fill("100.01");
    await page.getByLabel("هشدار قبل از موعد (کیلومتر)", { exact: true }).fill("100.01");
    await page.getByLabel("کیلومتر آخرین سرویس", { exact: true }).fill("100.01");
    await page.getByRole("checkbox", { name: "زمان", exact: true }).check();
    await page.getByLabel("فاصلهٔ سرویس (روز)", { exact: true }).fill("30");
    await page.getByRole("button", { name: "ثبت برنامهٔ سرویس", exact: true }).click();
    await expect(page.getByText("هشدار باید غیرمنفی و کمتر از فاصلهٔ همان معیار باشد.", { exact: true })).toBeVisible();
    await page.getByLabel("هشدار قبل از موعد (کیلومتر)", { exact: true }).fill("10.01");
    await expect(page.getByText("هشدار باید غیرمنفی و کمتر از فاصلهٔ همان معیار باشد.", { exact: true })).toHaveCount(0);
    await captureResponsiveThemes(page, "service-plan-form");
    await page.getByRole("button", { name: "ثبت برنامهٔ سرویس", exact: true }).click(); await expect(page).toHaveURL(/\/maintenance\/plans$/);
    const row = page.getByRole("row").filter({ hasText: token }); await expect(row.getByText("موعدرسیده", { exact: true })).toBeVisible();
    await row.getByRole("link", { name: `مشاهدهٔ برنامه ${token}`, exact: true }).click(); await expect(page).toHaveURL(/\/maintenance\/plans\/\d+$/);
    const id = Number(new URL(page.url()).pathname.split("/").at(-1));
    const sidebar = page.getByRole("complementary", { name: "خلاصهٔ برنامه" });
    await expect(sidebar.getByText("موعدرسیده", { exact: true })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "زمان" }).getByText("تاریخ آخرین سرویس ثبت نشده", { exact: true })).toBeVisible();
    await captureResponsiveThemes(page, "service-plan-details");
    await sidebar.getByRole("link", { name: "تشکیل پروندهٔ سرویس", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/work-orders/create\\?planId=${id}$`));
    await expect(page.getByLabel("خودرو", { exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "ثبت پروندهٔ تعمیر", exact: true }).click(); await expect(page).toHaveURL(/\/maintenance\/work-orders$/);
    await page.goto(`/maintenance/plans/${id}`); await sidebar.getByRole("link", { name: "ویرایش برنامه", exact: true }).click();
    await expect(page.getByLabel("خودرو", { exact: true })).toBeDisabled(); await expect(page.getByLabel("کیلومتر آخرین سرویس", { exact: true })).toHaveAttribute("readonly", "");
    await page.getByLabel("برنامه فعال باشد", { exact: true }).uncheck();
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click(); await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/maintenance/plans/${id}$`)); await expect(sidebar.getByText("غیرفعال", { exact: true })).toBeVisible(); await expect(sidebar.getByRole("button", { name: "تشکیل پروندهٔ سرویس", exact: true })).toBeDisabled();
    await expect(page.getByRole("table", { name: "پرونده‌های برنامهٔ سرویس" }).getByRole("link")).toHaveCount(1);
  } finally {
    try { await adapter.underlyingDriver().request().input("token", token).query(`
      DELETE o FROM maintenance.WorkOrder o JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
      DELETE p FROM maintenance.MaintenancePlan p JOIN fleet.Vehicle v ON v.VehicleId=p.VehicleId WHERE v.VehicleCode=@token;
      DELETE fleet.Vehicle WHERE VehicleCode=@token; DELETE fleet.VehicleModel WHERE ModelName=@token; DELETE fleet.VehicleBrand WHERE BrandName=@token; DELETE fleet.VehicleStatus WHERE StatusName=@token; DELETE maintenance.MaintenanceType WHERE TypeCode=@token;
    `); } finally { await adapter.dispose(); }
  }
});
