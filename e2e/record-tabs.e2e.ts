import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase } from "./support/e2e-database";
import { captureResponsiveThemes } from "./support/visual-evidence";
test("retains trip workspace navigation and terminal tab styling through shared record tabs", async ({ page }) => {
  test.setTimeout(150000);
  const token = `E2E-TABS-${randomUUID().slice(0, 8)}`, adapter = await connectToE2EDatabase();
  try {
    const result = await adapter.underlyingDriver().request().input("token", token).query<{ id: number }>(`
      DECLARE @type int=(SELECT TOP (1) TripRequestTypeId FROM trip.TripRequestType ORDER BY TripRequestTypeId);
      IF @type IS NULL THROW 50000,'Trip request reference data is required for this isolated test.',1;
      INSERT trip.TripRequest (RequestNo,TripRequestTypeId,RequestDateTime,RequestedTravelDateTime,Purpose,Status,CreatedAt) VALUES (@token,@type,SYSDATETIME(),SYSDATETIME(),@token,N'Cancelled',SYSDATETIME());
      SELECT CONVERT(int,SCOPE_IDENTITY()) id;
    `); const id = result.recordset[0].id;
    await page.goto(`/trips/${id}`);
    const navigation = page.getByRole("navigation", { name: "بخش‌های پرونده سفر", exact: true });
    await expect(navigation.getByRole("link")).toHaveCount(5);
    await expect(navigation.getByRole("link", { name: "جزئیات سفر", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(navigation.getByRole("link", { name: "لغوشده", exact: true })).toHaveAttribute("data-tone", "negative");
    await captureResponsiveThemes(page, "shared-trip-tabs");
    await navigation.getByRole("link", { name: "مسافران", exact: true }).click();
    await expect(page).toHaveURL(/tab=passengers/);
    await expect(navigation.getByRole("link", { name: "مسافران", exact: true })).toHaveAttribute("aria-current", "page");
    await page.setViewportSize({ width: 390, height: 844 });
    await navigation.getByRole("link", { name: "لغوشده", exact: true }).click();
    await expect(page).toHaveURL(/tab=completion/);
    await expect(navigation.getByRole("link", { name: "لغوشده", exact: true })).toHaveAttribute("aria-current", "page");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  } finally {
    try { await adapter.underlyingDriver().request().input("token", token).query("DELETE trip.TripRequest WHERE RequestNo=@token"); }
    finally { await adapter.dispose(); }
  }
});
