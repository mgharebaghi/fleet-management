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
 * A link that stays on the current route (pagination, "clear filters") only
 * changes the search params of the page already on screen, so React keeps
 * the previous, already-revealed content instead of showing the shared
 * `loading.tsx` fallback — that boundary was never built to signal this
 * case, only a navigation to a different route. `ActionLink` now renders a
 * decorative `useLinkStatus` hint for exactly this gap. Verified here on the
 * "پاک کردن" (clear filters) link, which every listing in scope shares with
 * pagination through the same `ActionLink` component.
 */
test("centres same-route ActionLink loading in the results panel while navigation is held", async ({
  page,
}) => {
  await page.goto("/people?search=E2E-ACTIONLINK-HINT");

  const clearLink = page.getByRole("link", { name: "پاک کردن فیلترها", exact: true });
  await expect(clearLink).toBeVisible();
  const hint = clearLink.locator('span[aria-hidden="true"]');
  await expect(hint).toHaveCSS("visibility", "hidden");

  const gate = gateNextNavigation();
  await page.route("**/people*", async (route) => {
    const request = route.request();
    if (
      request.headers().rsc !== "1" ||
      new URL(request.url()).searchParams.has("search")
    ) {
      await route.continue();
      return;
    }
    await gate.hold(route);
  });

  await clearLink.click();

  await gate.reached;
  await expect(page.locator("[data-scoped-loading]")).toBeVisible();
  await expect(hint).toHaveCSS("visibility", "hidden");
  const overlay = await page.locator("[data-scoped-loading]").boundingBox();
  const status = await page.getByRole("status").boundingBox();
  expect(overlay && status).toBeTruthy();
  expect(Math.abs(overlay!.y + overlay!.height / 2 - status!.y - status!.height / 2)).toBeLessThan(2);

  gate.release();

  // Criteria are gone once the navigation lands, so the clear link itself —
  // hint included — is no longer rendered at all.
  await expect(page).toHaveURL(/\/people$/);
  await expect(clearLink).toBeHidden({ timeout: 10_000 });
});
