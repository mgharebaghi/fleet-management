import { expect, test, type Route } from "@playwright/test";

/**
 * Holds one Server Component navigation request until the test releases it,
 * mirroring the gating technique in list-filters.e2e.ts.
 */
function gateNextNavigation() {
  let markReached!: () => void;
  const reached = new Promise<void>((resolve) => {
    markReached = resolve;
  });
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    reached,
    release,
    async hold(route: Route) {
      markReached();
      await released;
      await route.continue();
    },
  };
}

/**
 * Hold the RSC response to cover the interval before a route loading.tsx
 * fallback can arrive. Every submenu uses the shared central loading surface.
 */
const adminRoutes = [
  { path: "/fleet/catalogs", linkName: "کاتالوگ خودروها" },
  { path: "/fleet/vehicle-insurances", linkName: "بیمه ها" },
  { path: "/fleet/vehicles", linkName: "خودروهای سازمان" },
  { path: "/drivers", linkName: "رانندگان" },
  { path: "/inventory/parts", linkName: "قطعات" },
  { path: "/inventory/warehouses", linkName: "انبارها" },
  { path: "/inventory/catalogs", linkName: "اطلاعات پایه" },
] as const;

for (const target of adminRoutes) {
  test(`shows the shared loading indicator while navigating into ${target.path}`, async ({
    page,
  }) => {
    await page.goto("/people");

    const gate = gateNextNavigation();
    let navigationArmed = false;
    await page.route(`**${target.path}*`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      // `*` would also match `/fleet/vehicle-insurances` for the vehicles path.
      if (url.pathname !== target.path) {
        await route.continue();
        return;
      }
      // Opening a sidebar group prefetches its links before the click. Next tags
      // those with `next-router-prefetch` or `next-router-segment-prefetch`.
      const headers = request.headers();
      if (
        !navigationArmed ||
        headers.rsc !== "1" ||
        headers["next-router-prefetch"] ||
        headers["next-router-segment-prefetch"]
      ) {
        await route.continue();
        return;
      }
      await gate.hold(route);
    });

    const sidebar = page.getByRole("navigation", { name: "پیمایش اصلی" });
    if (target.path.startsWith("/fleet")) {
      const fleet = sidebar.getByRole("button", { name: "ناوگان" });
      await fleet.click();
      await expect(fleet).toHaveAttribute("aria-expanded", "true");
    }
    if (target.path.startsWith("/inventory")) {
      await sidebar.getByRole("button", { name: "قطعات و انبار", exact: true }).click();
    }
    navigationArmed = true;
    await sidebar.getByRole("link", { name: target.linkName }).click();

    await gate.reached;
    await expect(page.getByRole("status")).toContainText("در حال بارگذاری", {
      timeout: 10_000,
    });

    gate.release();

    await expect(page).toHaveURL(new RegExp(`${target.path}$`));
    await expect(page.getByRole("status")).toBeHidden({ timeout: 10_000 });
  });
}
