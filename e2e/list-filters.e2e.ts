import { expect, test, type Route } from "@playwright/test";

const listings = [
  { path: "/people", searchLabel: "جستجوی اشخاص" },
  { path: "/fleet/vehicles", searchLabel: "جستجوی خودرو" },
] as const;

/**
 * Holds every Server Component request carrying one search value until the test
 * releases it. Holding all of them — not only the first — keeps the listing from
 * committing that value through a navigation the controller reschedules once an
 * earlier one lands, which is what makes the assertions below deterministic.
 */
function createSearchRequestGate(searchValue: string) {
  let markReached!: () => void;
  const reached = new Promise<void>((resolve) => {
    markReached = resolve;
  });
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    searchValue,
    reached,
    release,
    async hold(route: Route) {
      markReached();
      await released;
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
    const firstNavigation = createSearchRequestGate(firstPart);
    const secondNavigation = createSearchRequestGate(completedSearch);
    const gates = [firstNavigation, secondNavigation];

    await page.route(`**${listing.path}?**`, async (route) => {
      const request = route.request();
      if (request.headers().rsc !== "1") {
        await route.continue();
        return;
      }

      const search = currentSearchParam(request.url());
      const gate = gates.find((candidate) => candidate.searchValue === search);
      if (!gate) {
        await route.continue();
        return;
      }

      await gate.hold(route);
    });

    await page.goto(listing.path);
    const searchInput = page.getByRole("searchbox", {
      name: listing.searchLabel,
    });
    await expect(searchInput).toHaveValue("");
    const originalInput = await searchInput.elementHandle();

    await searchInput.fill(firstPart);
    await firstNavigation.reached;

    // The user resumes typing while the first debounced Server Component
    // request is still in flight, so a second navigation is now in flight too.
    await searchInput.fill(completedSearch);
    await secondNavigation.reached;

    firstNavigation.release();

    // Only the older navigation may commit: the newer one is still held, so the
    // committed search value is exactly the earlier draft, never a prefix of it.
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

    secondNavigation.release();

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
