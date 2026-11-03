import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { connectToE2EDatabase, createPerson, type E2EDatabaseAdapter } from "./support/e2e-database";

test.describe("Shared page navigation", () => {
  const token = `E2E-nav-${randomUUID().slice(0, 12)}`;
  let adapter: E2EDatabaseAdapter, personId: number, driverId: number, partId: number;
  test.beforeAll(async () => {
    test.setTimeout(60000);
    adapter = await connectToE2EDatabase();
    personId = await createPerson(adapter, { firstName: "Navigation", lastName: token, personnelNo: token, isActive: true });
    driverId = (await adapter.underlyingDriver().request().input("id", personId).query<{ id: number }>("INSERT INTO driver.Driver (PersonId) OUTPUT INSERTED.DriverId id VALUES (@id)")).recordset[0].id;
    const part = await adapter.underlyingDriver().request().input("token", token).query<{ id: number }>(`
      DECLARE @unit int;
      INSERT INTO inventory.Unit (UnitName) VALUES (@token);
      SET @unit=SCOPE_IDENTITY();
      INSERT INTO inventory.Part (PartCode,PartName,UnitId) OUTPUT INSERTED.PartId id VALUES (@token,@token,@unit);
    `);
    partId = part.recordset[0].id;
  });
  test.afterAll(async () => {
    test.setTimeout(60000);
    try { if (adapter) {
      await adapter.underlyingDriver().request().input("token", token).query("DELETE FROM inventory.Part WHERE PartCode=@token; DELETE FROM inventory.Unit WHERE UnitName=@token;");
      if (personId) await adapter.underlyingDriver().request().input("id", personId).query("DELETE FROM driver.Driver WHERE PersonId=@id; DELETE FROM person.People WHERE PersonId=@id;");
    } } finally { await adapter?.dispose(); }
  });

  test("centres pending search on the visible table and mobile results", async ({ page }) => {
    await page.goto(`/inventory/parts?search=${token}`);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/inventory/parts*", async route => {
      if (route.request().headers().rsc === "1" && new URL(route.request().url()).searchParams.get("search") === `${token}-missing`) { await gate; }
      await route.continue();
    });
    try {
      await page.getByLabel("جستجوی قطعه", { exact: true }).fill(`${token}-missing`);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 844 });
        const overlay = page.locator("[data-scoped-loading]");
        await expect(overlay).toBeVisible();
        await expect(page.locator("[data-route-navigation-loading]")).toHaveCount(0);
        await expect.poll(async () => {
          const [area, status] = await Promise.all([overlay.boundingBox(), overlay.getByRole("status").boundingBox()]);
          return area && status ? Math.abs(area.y + area.height / 2 - status.y - status.height / 2) : 999;
        }).toBeLessThan(2);
        await expect(overlay.locator("..")).toHaveAttribute("data-loading-results", "true");
      }
    } finally { release(); }
    await expect(page.locator("[data-scoped-loading]")).toHaveCount(0);
  });

  test("centres a pending form submission in its form panel", async ({ page }) => {
    await page.goto("/people/create");
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/people/create", async route => {
      if (route.request().headers()["next-action"]) await gate;
      await route.continue();
    });
    try {
      await page.getByRole("button", { name: "ثبت شخص", exact: true }).click();
      const overlay = page.locator("form > [data-scoped-loading]");
      await expect(overlay).toBeVisible();
      await expect(overlay.getByRole("status")).toHaveText("در حال بارگذاری");
      const area = await overlay.boundingBox(), status = await overlay.getByRole("status").boundingBox();
      expect(area && status).toBeTruthy();
      expect(Math.abs(area!.y + area!.height / 2 - status!.y - status!.height / 2)).toBeLessThan(2);
    } finally { release(); }
    await expect(page.locator("[data-scoped-loading]")).toHaveCount(0);
  });

  for (const kind of ["driver", "driver-mobile", "part-view", "part-edit", "back", "wizard-exit"] as const) {
    test(`centres page loading for ${kind} navigation`, async ({ page }) => {
      let release!: () => void;
      const released = new Promise<void>(resolve => { release = resolve; });
      let reached = false, armed = false;
      const driver = kind === "driver" || kind === "driver-mobile";
      const target = driver ? `/drivers/${driverId}` : kind === "part-view" ? `/inventory/parts/${partId}` : kind === "part-edit" ? `/inventory/parts/${partId}/edit` : kind === "wizard-exit" ? "/trips" : "/inventory/parts";
      await page.route("**/*", async route => {
        const request = route.request(), headers = request.headers();
        if (new URL(request.url()).pathname !== target || headers.rsc !== "1") return route.continue();
        if (headers["next-router-prefetch"] || headers["next-router-segment-prefetch"]) return route.abort();
        if (!armed) return route.continue();
        reached = true;
        await released;
        await route.continue();
      });
      if (kind === "driver-mobile") await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(driver ? `/drivers?search=${token}` : kind === "back" ? `/inventory/parts/${partId}` : kind === "wizard-exit" ? "/trips/create" : `/inventory/parts?search=${token}`);
      const label = driver ? "پروندهٔ راننده" : kind === "part-view" ? `مشاهده پروندهٔ ${token}` : kind === "part-edit" ? `ویرایش ${token}` : kind === "wizard-exit" ? "انصراف" : "بازگشت به قطعات";
      armed = true;
      try {
        await page.getByRole(kind === "wizard-exit" ? "button" : "link", { name: label, exact: true }).click();
        await expect.poll(() => reached).toBe(true);
        const overlay = page.locator("[data-route-navigation-loading]");
        await expect(overlay).toBeVisible();
        await expect(overlay.getByRole("status")).toHaveText("در حال بارگذاری");
        await expect(page.getByRole("status")).toHaveCount(1);
        const workspace = await page.locator("[data-admin-content]").boundingBox();
        const loader = await overlay.getByRole("status").boundingBox();
        expect(workspace && loader).toBeTruthy();
        expect(Math.abs(loader!.y + loader!.height / 2 - workspace!.y - workspace!.height / 2)).toBeLessThan(2);
        expect(Math.abs(loader!.x + loader!.width / 2 - workspace!.x - workspace!.width / 2)).toBeLessThan(2);
        if (kind === "driver-mobile") await page.screenshot({ path: test.info().outputPath("central-loading-mobile.png"), fullPage: true });
      } finally { release(); }
      await expect(page).toHaveURL(url => url.pathname === target);
      await expect(page.locator("[data-route-navigation-loading]")).toHaveCount(0);
    });
  }
});
