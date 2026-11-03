import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";

test.describe("Maintenance type deletion", () => {
  const token = `E2E-MD-${randomUUID().slice(0, 10)}`;
  const unusedName = `بدون استفاده ${token}`, usedName = `استفاده‌شده ${token}`;
  let adapter: E2EDatabaseAdapter;
  test.beforeAll(async () => { adapter = await connectToE2EDatabase(); });
  test.afterAll(async () => {
    test.setTimeout(60000);
    try { if (adapter) await adapter.underlyingDriver().request().input("token", token).query(`
      DELETE p FROM maintenance.MaintenancePlan p JOIN fleet.Vehicle v ON v.VehicleId=p.VehicleId WHERE v.VehicleCode=@token;
      DELETE fleet.Vehicle WHERE VehicleCode=@token;
      DELETE fleet.VehicleModel WHERE ModelName=@token;
      DELETE fleet.VehicleBrand WHERE BrandName=@token;
      DELETE fleet.VehicleStatus WHERE StatusName=@token;
      DELETE maintenance.MaintenanceType WHERE TypeCode LIKE @token+'%';
    `); } finally { await adapter?.dispose(); }
  });
  test("disables deletion for used types in tables/cards and confirms unused deletion", async ({ page }) => {
    test.setTimeout(150000);
    let usedId: number;
    for (const [suffix, name] of [["unused", unusedName], ["used", usedName]]) {
      await page.goto("/maintenance/catalogs/create");
      await page.getByLabel("کد نوع تعمیر و سرویس", { exact: true }).fill(`${token}-${suffix}`);
      await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(name);
      await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
      await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/);
      if (suffix === "used") usedId = Number(new URL(page.url()).pathname.split("/").at(-1));
    }
    await adapter.underlyingDriver().request().input("token", token).input("type", usedId!).query(`
      DECLARE @brand int,@model int,@status int,@vehicle int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,ModelId,VehicleStatusId) VALUES (@token,N'12',@model,@status); SET @vehicle=SCOPE_IDENTITY();
      INSERT maintenance.MaintenancePlan (VehicleId,MaintenanceTypeId,PlanTitle,IntervalDays,IsActive) VALUES (@vehicle,@type,@token,30,0);
    `);
    await page.goto(`/maintenance/catalogs?active=all&search=${token}`);
    const usedLabel = `حذف ${usedName} امکان‌پذیر نیست؛ این نوع تعمیر و سرویس استفاده شده است`;
    await expect(page.getByRole("button", { name: usedLabel, exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: `حذف ${unusedName}`, exact: true })).toBeEnabled();
    await captureResponsiveThemes(page, "maintenance-type-delete");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: usedLabel, exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: `حذف ${unusedName}`, exact: true })).toBeEnabled();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole("button", { name: `حذف ${unusedName}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "حذف نوع تعمیر و سرویس", exact: true });
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    await expect(page.getByRole("row").filter({ hasText: unusedName })).toBeVisible();
    await page.getByRole("button", { name: `حذف ${unusedName}`, exact: true }).click();
    await dialog.getByRole("button", { name: "حذف", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: unusedName })).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: usedName })).toBeVisible();
    const result = await adapter.underlyingDriver().request().input("token", token).query<{ total: number; plans: number }>(`SELECT (SELECT COUNT(*) FROM maintenance.MaintenanceType WHERE TypeCode LIKE @token+'%') total,(SELECT COUNT(*) FROM maintenance.MaintenancePlan WHERE PlanTitle=@token) plans`);
    expect(result.recordset).toEqual([{ total: 1, plans: 1 }]);
  });
});
