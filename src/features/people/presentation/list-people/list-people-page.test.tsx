import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonSearchResult } from "../../application/list-people/person-search";
import { ListPeoplePage } from "./list-people-page";

const { executeListPeople, makeListPeople } = vi.hoisted(() => ({
  executeListPeople: vi.fn(),
  makeListPeople: vi.fn(),
}));

vi.mock("../../composition/list-people.factory", () => ({
  makeListPeople,
}));

vi.mock("./list-people-filters", () => ({
  ListPeopleFilters: ({
    initialSearch,
    initialStatus,
  }: {
    initialSearch: string;
    initialStatus: string;
  }) => (
    <div
      data-testid="list-people-filters"
      data-search={initialSearch}
      data-status={initialStatus}
    />
  ),
}));

const peopleResult: PersonSearchResult = {
  people: [
    {
      personId: 2,
      personnelNo: "P-200",
      firstName: "مریم",
      lastName: "احمدی",
      nationalCode: "0012345679",
      isActive: true,
    },
    {
      personId: 1,
      personnelNo: null,
      firstName: "علی",
      lastName: "رضایی",
      nationalCode: null,
      isActive: false,
    },
  ],
  totalCount: 2,
};

async function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  return renderToStaticMarkup(await ListPeoplePage({ searchParams }));
}

describe("ListPeoplePage", () => {
  beforeEach(() => {
    executeListPeople.mockReset();
    makeListPeople.mockReset();
    makeListPeople.mockReturnValue({ execute: executeListPeople });
    executeListPeople.mockResolvedValue(peopleResult);
  });

  it("renders PersonSummary rows, nullable placeholders, and create link", async () => {
    const markup = await renderPage();

    expect(markup).toContain("مریم احمدی");
    expect(markup).toContain("علی رضایی");
    expect(markup).toContain("P-200");
    expect(markup).toContain("0012345679");
    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain('href="/people/create"');
  });

  it("keeps nullable fields as an em dash in both the desktop and mobile representations", async () => {
    const markup = await renderPage();

    expect(markup.match(/—/g)).toHaveLength(4);
  });

  it("renders a labeled mobile card representation alongside the desktop table", async () => {
    const markup = await renderPage();

    expect(markup).toContain("<dt>شماره پرسنلی</dt>");
    expect(markup).toContain("<dt>کد ملی</dt>");
  });

  it.each([
    ["active", true],
    ["inactive", false],
    ["all", null],
    ["invalid", undefined],
  ] as const)(
    "maps status %s from the URL to isActive %s",
    async (status, isActive) => {
      await renderPage({ search: "  علی  ", page: "3", status });

      expect(executeListPeople).toHaveBeenCalledWith({
        search: "  علی  ",
        pageNumber: 3,
        isActive,
      });
    },
  );

  it("preserves the Application default when status and page are absent", async () => {
    await renderPage();

    expect(executeListPeople).toHaveBeenCalledWith({
      search: undefined,
      pageNumber: undefined,
      isActive: undefined,
    });
  });

  it("renders the initial empty state with a create call to action", async () => {
    executeListPeople.mockResolvedValue({ people: [], totalCount: 0 });

    const markup = await renderPage();

    expect(markup).toContain("هنوز شخصی ثبت نشده است");
    expect(markup).toContain('href="/people/create"');
    expect(markup).not.toContain(
      "نتیجه‌ای مطابق جستجو یا فیلتر شما پیدا نشد",
    );
  });

  it("renders a distinct empty state for an applied search or filter", async () => {
    executeListPeople.mockResolvedValue({ people: [], totalCount: 0 });

    const markup = await renderPage({ search: "ناشناخته", status: "all" });

    expect(markup).toContain(
      "نتیجه‌ای مطابق جستجو یا فیلتر شما پیدا نشد",
    );
    expect(markup).toContain('href="/people"');
    expect(markup).not.toContain("هنوز شخصی ثبت نشده است");
  });

  it("preserves search and status in pagination links", async () => {
    executeListPeople.mockResolvedValue({
      people: peopleResult.people,
      totalCount: 45,
    });

    const markup = await renderPage({
      search: "Ali",
      status: "inactive",
      page: "2",
    });

    expect(markup).toContain(
      'href="/people?search=Ali&amp;status=inactive&amp;page=1"',
    );
    expect(markup).toContain(
      'href="/people?search=Ali&amp;status=inactive&amp;page=3"',
    );
  });

  it("renders a safe Persian error without exposing internal details", async () => {
    executeListPeople.mockRejectedValue(
      new Error("Prisma SQL connection failed with secret details"),
    );

    const markup = await renderPage();

    expect(markup).toContain("دریافت فهرست اشخاص امکان‌پذیر نبود");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("Prisma");
    expect(markup).not.toContain("SQL");
    expect(markup).not.toContain("secret details");
  });
});
