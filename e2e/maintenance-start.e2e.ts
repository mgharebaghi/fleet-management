import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";

test("starts repair from every tab and keeps request-to-file navigation clear", async ({ page }) => {
  test.setTimeout(240000);
  const token = `E2E-START-${randomUUID().slice(0, 8)}`;
  const adapter: E2EDatabaseAdapter = await connectToE2EDatabase();
  try {
    await page.goto("/maintenance/catalogs/create");
    await page.getByLabel("کد نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByLabel("عنوان نوع تعمیر و سرویس", { exact: true }).fill(token);
    await page.getByRole("button", { name: "ثبت نوع تعمیر و سرویس", exact: true }).click();
    await expect(page).toHaveURL(/\/maintenance\/catalogs\/\d+$/);
    const typeId = Number(new URL(page.url()).pathname.split("/").at(-1));
    const fixture = await adapter.underlyingDriver().request().input("token", token).input("type", typeId).query<{ orderId: number; requestId: number; unusedId: number }>(`
      DECLARE @brand int,@model int,@status int,@vehicle int,@request int,@unused int;
      INSERT fleet.VehicleBrand (BrandName) VALUES (@token); SET @brand=SCOPE_IDENTITY();
      INSERT fleet.VehicleModel (BrandId,ModelName) VALUES (@brand,@token); SET @model=SCOPE_IDENTITY();
      INSERT fleet.VehicleStatus (StatusName) VALUES (@token); SET @status=SCOPE_IDENTITY();
      INSERT fleet.Vehicle (VehicleCode,PlateNoLeftSide,PlateNoCenterChar,PlateNoRightSide,PlateNoIranNo,ModelId,VehicleStatusId,CurrentOdometer) VALUES (@token,N'12',N'الف',N'345',N'67',@model,@status,100.01); SET @vehicle=SCOPE_IDENTITY();
      INSERT maintenance.MaintenanceRequest (VehicleId,MaintenanceTypeId,ProblemDescription,Priority,Status) VALUES (@vehicle,@type,@token,N'فوری',N'Open'); SET @request=SCOPE_IDENTITY();
      INSERT maintenance.MaintenanceRequest (VehicleId,MaintenanceTypeId,ProblemDescription,Status) VALUES (@vehicle,@type,@token,N'Open'); SET @unused=SCOPE_IDENTITY();
      INSERT maintenance.WorkOrder (WorkOrderNo,VehicleId,MaintenanceTypeId,MaintenanceRequestId,WorkLocationType,Status,ProblemDescription) VALUES (@token,@vehicle,@type,@request,N'OnSite',N'Open',@token);
      SELECT CONVERT(int,SCOPE_IDENTITY()) orderId,@request requestId,@unused unusedId;
    `);
    const { orderId, requestId, unusedId } = fixture.recordset[0];
    await page.goto(`/maintenance/requests/${unusedId}`);
    await expect(page.getByRole("link", { name: "ویرایش درخواست", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "بستن درخواست", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "لغو درخواست", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "ثبت پروندهٔ تعمیر", exact: true })).toBeVisible();
    await page.goto(`/maintenance/requests/${requestId}`);
    const requestPanel = page.getByRole("complementary", { name: "پیگیری درخواست" });
    await expect(page.getByRole("link", { name: "ثبت پروندهٔ جدید", exact: true })).toHaveAttribute("href", `/maintenance/work-orders/create?requestId=${requestId}`);
    await expect(requestPanel.getByRole("link", { name: "ویرایش درخواست", exact: true })).toHaveCount(0);
    await expect(requestPanel.getByRole("button", { name: "بستن درخواست", exact: true })).toHaveCount(0);
    await expect(requestPanel.getByRole("button", { name: "لغو درخواست", exact: true })).toHaveCount(0);
    await expect(requestPanel.getByText("در انتظار تعمیر", { exact: true })).toBeVisible();
    await captureResponsiveThemes(page, "request-repair-navigation");
    for (const suffix of ["", "/tasks", "/parts", "/costs"]) {
      await page.goto(`/maintenance/work-orders/${orderId}${suffix}`);
      await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByRole("button", { name: "شروع تعمیر", exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "شروع تعمیر", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "شروع تعمیر", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "تأیید شروع تعمیر", exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByText("در حال تعمیر", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "شروع تعمیر", exact: true })).toHaveCount(0);
    const row = await adapter.underlyingDriver().request().input("id", orderId).query<{ status: string; started: Date; meter: string; requestStatus: string }>(`
      SELECT o.Status status,o.ActualStartDateTime started,CONVERT(varchar(40),v.CurrentOdometer) meter,r.Status requestStatus
      FROM maintenance.WorkOrder o JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId JOIN maintenance.MaintenanceRequest r ON r.MaintenanceRequestId=o.MaintenanceRequestId WHERE o.WorkOrderId=@id;
    `);
    expect(row.recordset[0]).toMatchObject({ status: "InProgress", meter: "100.01", requestStatus: "Open" });
    expect(row.recordset[0].started).not.toBeNull();
    await captureResponsiveThemes(page, "repair-started");
    await page.goto(`/maintenance/work-orders/${orderId}`);
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true })).toHaveCount(0);
    await page.goto(`/maintenance/requests?search=${token}`);
    await page.getByLabel("وضعیت رسیدگی", { exact: true }).selectOption("RepairInProgress");
    const linkedRow = page.getByRole("row").filter({ hasText: token }).filter({ hasText: "در حال تعمیر" });
    await expect(linkedRow).toHaveCount(1);
    await expect(linkedRow.getByRole("button", { name: /^لغو درخواست/ })).toHaveCount(0);
    await expect(linkedRow.getByRole("link", { name: /^ویرایش/ })).toHaveCount(0);
    await page.goto(`/maintenance/requests/${requestId}`);
    await expect(requestPanel.getByText("در حال تعمیر", { exact: true }).first()).toBeVisible();
    await expect(requestPanel.getByRole("heading", { name: "روند تعمیر", exact: true })).toBeVisible();
    await captureResponsiveThemes(page, "request-active-repair");
    await page.goto(`/maintenance/work-orders/${orderId}/costs`);
    await page.getByRole("button", { name: "لغو پروندهٔ تعمیر", exact: true }).click();
    const cancellation = page.getByRole("dialog", { name: "لغو پروندهٔ تعمیر", exact: true });
    await cancellation.getByRole("button", { name: "تأیید لغو پرونده", exact: true }).click();
    await expect(cancellation.getByText("علت توقف تعمیر را وارد کنید.", { exact: true })).toBeVisible();
    await cancellation.getByLabel("علت توقف تعمیر", { exact: true }).fill("توقف آزمایشی");
    await expect(cancellation.getByText("علت توقف تعمیر را وارد کنید.", { exact: true })).toHaveCount(0);
    await cancellation.getByRole("button", { name: "تأیید لغو پرونده", exact: true }).click();
    await expect(cancellation).not.toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByText("لغوشده", { exact: true })).toBeVisible();
    await adapter.underlyingDriver().request().input("id", orderId).query("UPDATE maintenance.WorkOrder SET Status=N'Completed' WHERE WorkOrderId=@id");
    await page.goto(`/maintenance/requests/${requestId}`);
    await expect(requestPanel.getByText("تعمیر انجام‌شده", { exact: true })).toBeVisible();
    await expect(requestPanel.getByText("تعمیر انجام‌شده", { exact: true })).toHaveClass(/positive/);
    await page.goto(`/maintenance/requests?search=${token}&status=RepairCompleted`);
    await expect(page.getByRole("row").filter({ hasText: token })).toHaveCount(1);
    await page.goto(`/maintenance/requests/${requestId}/edit`);
    await expect(page.getByText("این درخواست قابل ویرایش نیست", { exact: true })).toBeVisible();

  } finally {
    await adapter.underlyingDriver().request().input("token", token).query(`
      DELETE o FROM maintenance.WorkOrder o JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
      DELETE r FROM maintenance.MaintenanceRequest r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE v.VehicleCode=@token;
      DELETE fleet.Vehicle WHERE VehicleCode=@token; DELETE fleet.VehicleModel WHERE ModelName=@token;
      DELETE fleet.VehicleBrand WHERE BrandName=@token; DELETE fleet.VehicleStatus WHERE StatusName=@token;
      DELETE maintenance.MaintenanceType WHERE TypeCode=@token;
    `);
    await adapter.dispose();
  }
});
