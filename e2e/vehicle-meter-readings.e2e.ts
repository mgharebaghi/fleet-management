import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";
test("records exact vehicle meter history through the shared two-panel workspace", async ({ page }) => {
  test.setTimeout(240000);
  const token = `E2E-METER-${randomUUID().slice(0, 8)}`, adapter = await connectToE2EDatabase();
  try {
    const fixture = await adapter.underlyingDriver().request().input("token", token).query<{ id: number }>(`
      DECLARE @brand int,@model int,@status int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,PlateNoCenterChar,PlateNoRightSide,PlateNoIranNo,ModelId,VehicleStatusId,CurrentOdometer,CurrentEngineHour) VALUES (@token,N'12',N'الف',N'345',N'67',@model,@status,100.01,2.01);
      SELECT CONVERT(int,SCOPE_IDENTITY()) id;
    `);
    const id = fixture.recordset[0].id;
    await page.goto(`/fleet/vehicles/${id}`);
    const sidebar = page.getByRole("complementary", { name: "خلاصهٔ خودرو" });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "ویرایش اطلاعات", exact: true })).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "ثبت کارکرد", exact: true })).toHaveCount(0);
    await captureResponsiveThemes(page, "vehicle-two-panel-details");
    await page.getByRole("link", { name: "کارکرد خودرو", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/fleet/vehicles/${id}/meter-readings$`));
    await expect(sidebar.getByRole("link", { name: "ویرایش اطلاعات", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "پاک کردن فیلترها", exact: true })).toHaveCount(0);
    await expect(page.getByText("هنوز کارکردی ثبت نشده است", { exact: true })).toBeVisible();
    await sidebar.getByRole("button", { name: "ثبت کارکرد", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "ثبت کارکرد خودرو", exact: true });
    await dialog.getByRole("button", { name: "ثبت کارکرد", exact: true }).click();
    await expect(dialog.getByText("حداقل کیلومتر یا ساعت کارکرد را وارد کنید.", { exact: true })).toBeVisible();
    await dialog.getByLabel("کیلومتر خودرو", { exact: true }).fill("۹۹");
    await expect(dialog.getByText("حداقل کیلومتر یا ساعت کارکرد را وارد کنید.", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "ثبت کارکرد", exact: true }).click();
    await expect(dialog.getByText("کارکرد نمی‌تواند از مقدار فعلی یا سابقهٔ قبلی کمتر باشد.", { exact: true })).toBeVisible();
    await dialog.getByLabel("کیلومتر خودرو", { exact: true }).fill("۱۲۳۴۵۶٫۷۸");
    await expect(dialog.getByLabel("کیلومتر خودرو", { exact: true })).toHaveValue("123,456.78");
    await expect(dialog.getByText("کارکرد نمی‌تواند از مقدار فعلی یا سابقهٔ قبلی کمتر باشد.", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "ساعت کارکرد موتور", exact: true }).click();
    const hours = page.getByRole("dialog", { name: "انتخاب ساعت کارکرد موتور", exact: true });
    await hours.getByLabel("ساعت", { exact: true }).fill("25");
    await hours.getByLabel("دقیقه", { exact: true }).selectOption("06");
    await hours.getByRole("button", { name: "انتخاب کارکرد", exact: true }).click();
    await dialog.getByLabel("یادداشت", { exact: true }).fill(token);
    await captureResponsiveThemes(page, "vehicle-meter-form", { modal: true });
    await dialog.getByRole("button", { name: "ثبت کارکرد", exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 45000 });
    await expect(sidebar.getByText("123,456.78", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("25:06", { exact: true })).toBeVisible();
    const historyRow = page.getByRole("row").filter({ hasText: "123,456.78" });
    await expect(historyRow).toHaveCount(1);
    await historyRow.getByRole("button", { name: "جزئیات کارکرد خودرو", exact: true }).click();
    const details = page.getByRole("dialog", { name: "جزئیات کارکرد خودرو", exact: true });
    await expect(details.getByText(token, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await captureResponsiveThemes(page, "vehicle-meter-history");
    const search = page.getByLabel("جستجوی سوابق کارکرد", { exact: true });
    await search.fill("missing-history");
    await expect(page.getByText("سابقه‌ای مطابق جستجو پیدا نشد", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("123,456.78", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "پاک کردن فیلترها", exact: true }).click();
    await expect(historyRow).toHaveCount(1);
    await page.getByRole("link", { name: "مشخصات خودرو", exact: true }).click();
    await sidebar.getByRole("link", { name: "ویرایش اطلاعات", exact: true }).click();
    await expect(page.getByLabel("کیلومتر فعلی", { exact: true })).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("ساعت موتور", { exact: true })).toHaveAttribute("readonly", "");
    await page.getByLabel("شماره موتور", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await page.getByRole("dialog", { name: "ذخیره تغییرات", exact: true }).getByRole("button", { name: "تأیید و ذخیره", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/fleet/vehicles/${id}$`));
    await expect(sidebar.getByText("123,456.78", { exact: true })).toBeVisible();
    const result = await adapter.underlyingDriver().request().input("id", id).query<{ km: string; hours: string; engineNo: string; history: number; readingKm: string; readingHours: string }>(`
      SELECT CONVERT(varchar(40),v.CurrentOdometer) km,CONVERT(varchar(40),v.CurrentEngineHour) hours,v.EngineNo engineNo,
      (SELECT COUNT(*) FROM fleet.VehicleMeterReading WHERE VehicleId=@id) history,CONVERT(varchar(40),r.Odometer) readingKm,CONVERT(varchar(40),r.EngineHour) readingHours
      FROM fleet.Vehicle v JOIN fleet.VehicleMeterReading r ON r.VehicleId=v.VehicleId WHERE v.VehicleId=@id;
    `);
    expect(result.recordset).toEqual([{ km: "123456.78", hours: "25.10", engineNo: token, history: 1, readingKm: "123456.78", readingHours: "25.10" }]);
  } finally {
    try { await adapter.underlyingDriver().request().input("token", token).query(`
      DELETE r FROM fleet.VehicleMeterReading r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE v.VehicleCode=@token;
      DELETE fleet.Vehicle WHERE VehicleCode=@token; DELETE fleet.VehicleModel WHERE ModelName=@token;
      DELETE fleet.VehicleBrand WHERE BrandName=@token; DELETE fleet.VehicleStatus WHERE StatusName=@token;
    `); } finally { await adapter.dispose(); }
  }
});
