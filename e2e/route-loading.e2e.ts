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
 * Regression coverage for the audited "missing route loading" report on
 * Fleet Catalogs and Vehicle Insurance: navigating from one admin route to a
 * different one always mounts a fresh instance of the shared
 * `(admin)/loading.tsx` Suspense boundary, because the destination is a
 * different page component, not a re-render of the current one. React only
 * skips a loading fallback for a transition that keeps rendering the SAME
 * revealed component (e.g. a search-param-only update on the current page);
 * a cross-route navigation is never that case. Verified here by holding the
 * RSC response for each target route and asserting the shared indicator
 * shows while it's held, for every route in the approved scope — including
 * the two specifically reported as missing.
 */
const adminRoutes = [
  { path: "/fleet/catalogs", linkName: "کاتالوگ‌ها" },
  { path: "/fleet/vehicle-insurances", linkName: "بیمه ها" },
  { path: "/fleet/vehicles", linkName: "خودروها" },
  { path: "/drivers", linkName: "رانندگان" },
] as const;

for (const target of adminRoutes) {
  test(`shows the shared loading indicator while navigating into ${target.path}`, async ({
    page,
  }) => {
    await page.goto("/people");

    const gate = gateNextNavigation();
    await page.route(`**${target.path}*`, async (route) => {
      const request = route.request();
      // Every sidebar link is already in the viewport once /people settles, so
      // Next.js also fires its own automatic prefetch requests for this same
      // path (confirmed by instrumenting this page) — those are real `rsc: 1`
      // requests too, and one can reach this handler before the click below.
      // Next tags exactly those with `next-router-prefetch` (see
      // fetch-server-response.js vs. segment-cache/cache.js in the Next.js
      // source); the click's own navigation fetch never carries it. Passing
      // prefetches through unheld keeps the gate keyed to the click alone,
      // regardless of how the two race.
      if (request.headers().rsc !== "1" || request.headers()["next-router-prefetch"]) {
        await route.continue();
        return;
      }
      await gate.hold(route);
    });

    const sidebar = page.getByRole("navigation", { name: "پیمایش اصلی" });
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
