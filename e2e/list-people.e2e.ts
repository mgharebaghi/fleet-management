import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import type { E2EDatabaseAdapter } from "./support/e2e-database";
import {
  connectToE2EDatabase,
  createPerson,
  deletePeopleByIds,
  findPersonIdByPersonnelNo,
} from "./support/e2e-database";
import {
  createUniqueToken,
  createValidIranianNationalCode,
} from "./support/person-fixtures";

function getUrlSearchParams(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

test.describe.serial("List People", () => {
  let e2eDatabaseAdapter: E2EDatabaseAdapter;
  let token: string;
  let alphaPersonnelNo: string;
  let betaPersonnelNo: string;
  let gammaPersonnelNo: string;
  let deltaPersonnelNo: string;
  const seededPersonIds: number[] = [];

  test.beforeAll(async () => {
    e2eDatabaseAdapter = await connectToE2EDatabase();

    token = createUniqueToken();
    alphaPersonnelNo = `${token}-ALPHA`;
    betaPersonnelNo = `${token}-BETA`;
    gammaPersonnelNo = `${token}-GAMMA`;
    deltaPersonnelNo = `${token}-DELTA`;

    // Created sequentially so PersonId ordering is deterministic:
    // Alpha < Beta < Gamma < Delta.
    seededPersonIds.push(
      await createPerson(e2eDatabaseAdapter, {
        firstName: "زهرا",
        lastName: "الف",
        personnelNo: alphaPersonnelNo,
        isActive: true,
      }),
    );
    seededPersonIds.push(
      await createPerson(e2eDatabaseAdapter, {
        firstName: "سارا",
        lastName: "ب",
        personnelNo: betaPersonnelNo,
        isActive: true,
      }),
    );
    seededPersonIds.push(
      await createPerson(e2eDatabaseAdapter, {
        firstName: "نگار",
        lastName: "ج",
        personnelNo: gammaPersonnelNo,
        isActive: false,
      }),
    );
    seededPersonIds.push(
      await createPerson(e2eDatabaseAdapter, {
        firstName: "الهام",
        lastName: "د",
        personnelNo: deltaPersonnelNo,
        isActive: true,
      }),
    );
  });

  test.afterAll(async () => {
    if (e2eDatabaseAdapter) {
      await deletePeopleByIds(e2eDatabaseAdapter, seededPersonIds);
      await e2eDatabaseAdapter.dispose();
    }
  });

  test("renders seeded people ordered by PersonId descending", async ({
    page,
  }) => {
    await page.goto(`/people?search=${encodeURIComponent(token)}`);

    const rowTexts = await page
      .locator("table tbody tr", { hasText: token })
      .allTextContents();

    // Gamma is inactive and excluded by the default status filter.
    expect(rowTexts).toHaveLength(3);
    expect(rowTexts[0]).toContain(deltaPersonnelNo);
    expect(rowTexts[1]).toContain(betaPersonnelNo);
    expect(rowTexts[2]).toContain(alphaPersonnelNo);
  });

  test("live search filters results after debounce, without a submit, and resets an existing page param", async ({
    page,
  }) => {
    await page.goto("/people");

    const searchInput = page.getByLabel("جستجوی اشخاص");
    await searchInput.fill(alphaPersonnelNo);

    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(alphaPersonnelNo)}`),
    );
    await expect(
      page.locator("table tbody tr", { hasText: alphaPersonnelNo }),
    ).toHaveCount(1);
    await expect(
      page.locator("table tbody tr", { hasText: betaPersonnelNo }),
    ).toHaveCount(0);
    await expect(
      page.locator("table tbody tr", { hasText: deltaPersonnelNo }),
    ).toHaveCount(0);

    await page.goto("/people?page=2");
    await searchInput.fill(alphaPersonnelNo);

    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(alphaPersonnelNo)}`),
    );
    expect(getUrlSearchParams(page).has("page")).toBe(false);
  });

  test("keeps the search input focused through the debounced update", async ({
    page,
  }) => {
    await page.goto("/people");

    const searchInput = page.getByLabel("جستجوی اشخاص");
    await searchInput.click();
    await expect(searchInput).toBeFocused();

    const firstPart = alphaPersonnelNo.slice(0, -2);
    const secondPart = alphaPersonnelNo.slice(-2);

    await searchInput.pressSequentially(firstPart, { delay: 30 });
    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(firstPart)}`),
    );
    await expect(searchInput).toBeFocused();

    // Continues typing without re-clicking the field.
    await searchInput.pressSequentially(secondPart, { delay: 30 });
    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(alphaPersonnelNo)}`),
    );
    await expect(searchInput).toBeFocused();
    await expect(
      page.locator("table tbody tr", { hasText: alphaPersonnelNo }),
    ).toHaveCount(1);
  });

  test("status filter switches visible people without a submit", async ({
    page,
  }) => {
    await page.goto(`/people?search=${encodeURIComponent(token)}`);

    await expect(
      page.locator("table tbody tr", { hasText: gammaPersonnelNo }),
    ).toHaveCount(0);
    await expect(
      page.locator("table tbody tr", { hasText: alphaPersonnelNo }),
    ).toHaveCount(1);

    await page.getByLabel("وضعیت").selectOption("inactive");
    await expect(page).toHaveURL(/status=inactive/);
    await expect(
      page.locator("table tbody tr", { hasText: gammaPersonnelNo }),
    ).toHaveCount(1);
    await expect(
      page.locator("table tbody tr", { hasText: alphaPersonnelNo }),
    ).toHaveCount(0);

    await page.getByLabel("وضعیت").selectOption("all");
    await expect(page).toHaveURL(/status=all/);
    for (const personnelNo of [
      alphaPersonnelNo,
      betaPersonnelNo,
      gammaPersonnelNo,
      deltaPersonnelNo,
    ]) {
      await expect(
        page.locator("table tbody tr", { hasText: personnelNo }),
      ).toHaveCount(1);
    }
  });

  test("preserves search and status together across live filter changes", async ({
    page,
  }) => {
    await page.goto("/people");

    await page.getByLabel("وضعیت").selectOption("all");
    await expect(page).toHaveURL(/status=all/);
    expect(getUrlSearchParams(page).has("search")).toBe(false);

    const searchInput = page.getByLabel("جستجوی اشخاص");
    await searchInput.fill(token);
    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(token)}`),
    );
    expect(getUrlSearchParams(page).get("status")).toBe("all");
    for (const personnelNo of [
      alphaPersonnelNo,
      betaPersonnelNo,
      gammaPersonnelNo,
      deltaPersonnelNo,
    ]) {
      await expect(
        page.locator("table tbody tr", { hasText: personnelNo }),
      ).toHaveCount(1);
    }

    await page.getByLabel("وضعیت").selectOption("inactive");
    await expect(page).toHaveURL(/status=inactive/);
    expect(getUrlSearchParams(page).get("search")).toBe(token);
    await expect(
      page.locator("table tbody tr", { hasText: gammaPersonnelNo }),
    ).toHaveCount(1);
    await expect(
      page.locator("table tbody tr", { hasText: alphaPersonnelNo }),
    ).toHaveCount(0);
  });

  test("shows the filtered empty state instead of the initial empty state", async ({
    page,
  }) => {
    await page.goto("/people");

    const noMatchSearch = `${token}-NOTFOUND`;
    await page.getByLabel("جستجوی اشخاص").fill(noMatchSearch);

    await expect(page).toHaveURL(
      new RegExp(`search=${encodeURIComponent(noMatchSearch)}`),
    );
    await expect(
      page.getByRole("heading", {
        name: "نتیجه‌ای مطابق جستجو یا فیلتر شما پیدا نشد",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "هنوز شخصی ثبت نشده است" }),
    ).toHaveCount(0);
  });

  test("shows the mobile card layout and hides the desktop table without horizontal scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      `/people?search=${encodeURIComponent(token)}&status=all`,
    );

    await expect(page.getByRole("table")).toBeHidden();
    await expect(
      page.locator("li", { hasText: alphaPersonnelNo }),
    ).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe.serial("Create Person to List People", () => {
  let e2eDatabaseAdapter: E2EDatabaseAdapter;
  const createdPersonIds = new Set<number>();

  test.beforeAll(async () => {
    e2eDatabaseAdapter = await connectToE2EDatabase();
  });

  test.afterEach(async () => {
    if (createdPersonIds.size > 0) {
      await deletePeopleByIds(e2eDatabaseAdapter, [...createdPersonIds]);
      createdPersonIds.clear();
    }
  });

  test.afterAll(async () => {
    await e2eDatabaseAdapter.dispose();
  });

  test("redirects to /people after a successful create and shows the new person ordered before an older one", async ({
    page,
  }) => {
    const token = createUniqueToken();
    const baselinePersonnelNo = `${token}-BASELINE`;
    const newPersonnelNo = `${token}-NEW`;

    const baselinePersonId = await createPerson(e2eDatabaseAdapter, {
      firstName: "پایه",
      lastName: token,
      personnelNo: baselinePersonnelNo,
      isActive: true,
    });
    createdPersonIds.add(baselinePersonId);

    await page.goto("/people");
    await page.getByRole("link", { name: "افزودن شخص" }).click();
    await expect(page).toHaveURL(/\/people\/create$/);

    await page.getByLabel("نام", { exact: true }).fill("تست");
    await page.getByLabel("نام خانوادگی", { exact: true }).fill(token);
    await page
      .getByLabel("شماره پرسنلی", { exact: true })
      .fill(newPersonnelNo);
    await page
      .getByLabel("کد ملی", { exact: true })
      .fill(createValidIranianNationalCode());
    await page.getByRole("button", { name: "ثبت شخص", exact: true }).click();

    await expect(page).toHaveURL(/\/people$/, { timeout: 10_000 });
    await expect(
      page.locator("table tbody tr", { hasText: newPersonnelNo }),
    ).toHaveCount(1);

    const newPersonId = await findPersonIdByPersonnelNo(
      e2eDatabaseAdapter,
      newPersonnelNo,
    );
    expect(newPersonId).not.toBeNull();
    if (newPersonId !== null) {
      createdPersonIds.add(newPersonId);
    }

    await page.goto(`/people?search=${encodeURIComponent(token)}`);
    const rowTexts = await page
      .locator("table tbody tr", { hasText: token })
      .allTextContents();

    expect(rowTexts).toHaveLength(2);
    expect(rowTexts[0]).toContain(newPersonnelNo);
    expect(rowTexts[1]).toContain(baselinePersonnelNo);
  });
});
