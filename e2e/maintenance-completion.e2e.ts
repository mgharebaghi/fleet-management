import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, type E2EDatabaseAdapter } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";

test("completes real repair and shows a clock-based duration estimate without auto-closing", async ({ page }) => {
  test.setTimeout(240000);
  const token = `E2E-END-${randomUUID().slice(0, 8)}`;
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
    const { orderId, requestId } = fixture.recordset[0];
    await adapter.underlyingDriver().request().input("id", orderId).input("token", token).query("INSERT maintenance.WorkOrderTask (WorkOrderId,TaskTitle,Status,LaborHours) VALUES (@id,@token,N'Open',48)");
    await page.goto(`/maintenance/work-orders/${orderId}/costs`);
    await page.getByRole("button", { name: "شروع تعمیر", exact: true }).click();
    await page.getByRole("dialog", { name: "شروع تعمیر", exact: true }).getByRole("button", { name: "تأیید شروع تعمیر", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "شروع تعمیر", exact: true })).not.toBeVisible({ timeout: 45000 });
    await page.goto(`/maintenance/work-orders/${orderId}`);
    const sidebar = page.getByRole("complementary", { name: "خلاصهٔ پرونده" });
    await expect(sidebar.getByRole("region", { name: "عملیات پرونده" })).toHaveCount(0);
    await expect(sidebar.getByRole("heading", { name: "کارها و اجرت", exact: true })).toHaveCount(0);
    await expect(sidebar.getByRole("heading", { name: "قطعات مصرف‌شده", exact: true })).toHaveCount(0);
    for (const suffix of ["", "/tasks", "/parts", "/costs"]) {
      await page.goto(`/maintenance/work-orders/${orderId}${suffix}`);
      await expect(sidebar.getByRole("button", { name: "ثبت پایان تعمیر", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "ثبت پایان تعمیر", exact: true })).toHaveCount(1);
    }
    const started = (await adapter.underlyingDriver().request().input("id", orderId).query<{ started: string }>("SELECT CONVERT(varchar(50),ActualStartDateTime AT TIME ZONE 'Iran Standard Time',127) started FROM maintenance.WorkOrder WHERE WorkOrderId=@id")).recordset[0].started;
    await page.clock.setFixedTime(new Date(Date.parse(started) + 24 * 3600000));
    const bar = page.getByRole("progressbar", { name: "زمان سپری‌شده از برآورد تعمیر" });
    await expect(bar).toHaveAttribute("value", "50");
    await expect(page.getByText("۱ روز باقی‌مانده", { exact: true })).toBeVisible();
    await captureResponsiveThemes(page, "repair-time-halfway");
    await page.clock.setFixedTime(new Date(Date.parse(started) + 49 * 3600000));
    await expect(page.getByText("زمان برآوردی تمام شده", { exact: true })).toBeVisible();
    await expect(bar).toHaveAttribute("value", "100");
    await page.reload();
    await expect(page.getByText("زمان برآوردی تمام شده", { exact: true })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByText("در حال تعمیر", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "ثبت پایان تعمیر", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "ثبت پایان تعمیر", exact: true });
    await dialog.getByRole("button", { name: "تأیید پایان تعمیر", exact: true }).click();
    await expect(dialog.getByText("نتیجهٔ نهایی تعمیر را وارد کنید.", { exact: true })).toBeVisible();
    await dialog.getByLabel("نتیجهٔ نهایی تعمیر", { exact: true }).fill("تعمیر انجام و خودرو بررسی شد.");
    await expect(dialog.getByText("نتیجهٔ نهایی تعمیر را وارد کنید.", { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "تأیید پایان تعمیر", exact: true }).click();
    await expect(dialog.getByText("ابتدا کارهای باقی‌مانده را انجام‌شده یا لغوشده مشخص کنید.", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "انصراف", exact: true }).click();
    await page.goto(`/maintenance/work-orders/${orderId}/tasks`);
    await page.getByRole("row").filter({ hasText: token }).getByRole("button", { name: `ویرایش کار ${token}`, exact: true }).click();
    const task = page.getByRole("dialog", { name: "ویرایش کار", exact: true });
    await task.getByLabel("وضعیت کار", { exact: true }).selectOption("Completed");
    await task.getByRole("button", { name: "ذخیره تغییرات", exact: true }).click();
    await expect(task).not.toBeVisible({ timeout: 45000 });
    await page.goto(`/maintenance/requests/${requestId}`);
    await expect(page.getByRole("progressbar", { name: "زمان سپری‌شده از برآورد تعمیر" })).toHaveAttribute("value", "100");
    const timeline = page.getByRole("heading", { name: "روند تعمیر", exact: true }).locator("..");
    await expect(timeline).toHaveAttribute("data-layout", "horizontal");
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 844 });
      const boxes = await timeline.getByRole("listitem").evaluateAll(items => items.map(item => ({ top: item.getBoundingClientRect().top, right: item.getBoundingClientRect().right })));
      expect(boxes).toHaveLength(3);
      expect(Math.max(...boxes.map(box => box.top)) - Math.min(...boxes.map(box => box.top))).toBeLessThan(2);
      expect(boxes[0].right).toBeGreaterThan(boxes[2].right);
    }
    await captureResponsiveThemes(page, "request-horizontal-timeline");
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/maintenance/work-orders/${orderId}/costs`);
    await page.getByRole("button", { name: "ثبت پایان تعمیر", exact: true }).click();
    await dialog.getByLabel("نتیجهٔ نهایی تعمیر", { exact: true }).fill("تعمیر انجام و خودرو بررسی شد.");
    await dialog.getByRole("button", { name: "تأیید پایان تعمیر", exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 45000 });
    await expect(page.getByRole("button", { name: "ثبت پایان تعمیر", exact: true })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "خلاصهٔ پرونده" }).getByText("تکمیل‌شده", { exact: true })).toBeVisible();
    await expect(page.getByText("تعمیر انجام و خودرو بررسی شد.", { exact: true })).toBeVisible();
    await captureResponsiveThemes(page, "repair-result");
    const saved = (await adapter.underlyingDriver().request().input("id", orderId).query<{ status: string; ended: string; labor: string | null }>("SELECT o.Status status,CONVERT(varchar(50),o.ActualEndDateTime AT TIME ZONE 'Iran Standard Time',127) ended,CONVERT(varchar(40),t.LaborCost) labor FROM maintenance.WorkOrder o JOIN maintenance.WorkOrderTask t ON t.WorkOrderId=o.WorkOrderId WHERE o.WorkOrderId=@id")).recordset[0];
    expect(saved.status).toBe("Completed"); expect(saved.labor).toBeNull(); expect(Math.abs(Date.now() - Date.parse(saved.ended))).toBeLessThan(300000);
    await page.goto(`/maintenance/requests/${requestId}`);
    await expect(page.getByText("تعمیر انجام‌شده", { exact: true })).toHaveClass(/positive/);
  } finally {
    try { await adapter.underlyingDriver().request().input("token", token).query(`
      DELETE t FROM maintenance.WorkOrderTask t JOIN maintenance.WorkOrder o ON o.WorkOrderId=t.WorkOrderId JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
      DELETE o FROM maintenance.WorkOrder o JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId WHERE v.VehicleCode=@token;
      DELETE r FROM maintenance.MaintenanceRequest r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId WHERE v.VehicleCode=@token;
      DELETE fleet.Vehicle WHERE VehicleCode=@token; DELETE fleet.VehicleModel WHERE ModelName=@token;
      DELETE fleet.VehicleBrand WHERE BrandName=@token; DELETE fleet.VehicleStatus WHERE StatusName=@token;
      DELETE maintenance.MaintenanceType WHERE TypeCode=@token;
    `);
    } finally { await adapter.dispose(); }
  }
});
