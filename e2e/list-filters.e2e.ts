import { expect, test, type Route } from "@playwright/test";

const listings = [
  { path: "/people", searchLabel: "جستجوی اشخاص" },
  { path: "/fleet/vehicles", searchLabel: "جستجوی خودرو" },
] as const;

function createSearchRequestGate() {
  const reached = Promise.withResolvers<void>();
  const released = Promise.withResolvers<void>();
  return {
    reached: reached.promise,
    release: released.resolve,
    async hold(route: Route) {
      reached.resolve();
      await released.promise;
      await route.continue();
    },
  };
}

function currentSearchParam(url: string): string | null {
  return new URL(url).searchParams.get("search");
}

for (const listing of listings) {
  test(`${listing.path} keeps newer typing when an earlier Server Component navigation finishes`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const firstPart = "E2E-RACE-ALP";
    const completedSearch = `${firstPart}HA`;
    const firstNavigation = createSearchRequestGate();

    await page.clock.install();
    await page.route(`**${listing.path}?**`, async (route) => {
      const request = route.request();
      if (request.headers().rsc === "1" && currentSearchParam(request.url()) === firstPart) {
        await firstNavigation.hold(route);
      } else {
        await route.continue();
      }
    });

    await page.goto(listing.path);
    const searchInput = page.getByRole("searchbox", {
      name: listing.searchLabel,
    });
    await expect(searchInput).toHaveValue("");
    const originalInput = await searchInput.elementHandle();

    try {
      await searchInput.fill(firstPart);
      await firstNavigation.reached;

      // Pause the browser clock before the second edit. The older response can
      // commit while the newer draft is typed but its debounce cannot fire yet.
      const browserTime = await page.evaluate(() => Date.now());
      await page.clock.pauseAt(browserTime + 500);
      await searchInput.fill(completedSearch);
      firstNavigation.release();

      await expect
        .poll(() => currentSearchParam(page.url()), { timeout: 10_000 })
        .toBe(firstPart);
      await expect(searchInput).toHaveValue(completedSearch);
      expect(
        await searchInput.evaluate(
          (current, original) => current === original,
          originalInput,
        ),
      ).toBe(true);
    } finally {
      firstNavigation.release();
      await page.clock.resume();
    }

    await expect
      .poll(() => currentSearchParam(page.url()), { timeout: 10_000 })
      .toBe(completedSearch);
    await expect(searchInput).toHaveValue(completedSearch);
    expect(
      await searchInput.evaluate(
        (current, original) => current === original,
        originalInput,
      ),
    ).toBe(true);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
