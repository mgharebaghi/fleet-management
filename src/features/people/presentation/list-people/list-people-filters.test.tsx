import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListPeopleFilters } from "./list-people-filters";

const navigation = vi.hoisted(() => ({
  pathname: "/people",
  query: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

describe("ListPeopleFilters", () => {
  beforeEach(() => {
    navigation.pathname = "/people";
    navigation.query = "";
    navigation.replace.mockReset();
  });

  it("renders its initial search and status from URL-derived props", () => {
    navigation.query = "search=Ali&status=inactive";

    const markup = renderToStaticMarkup(
      <ListPeopleFilters
        initialSearch="Ali"
        initialStatus="inactive"
        hasCriteria
      />,
    );

    expect(markup).toContain('name="search"');
    expect(markup).toContain('value="Ali"');
    expect(markup).toMatch(
      /<option value="inactive" selected="">غیرفعال<\/option>/,
    );
    expect(markup).toContain('href="/people"');
  });

  it("reflects externally changed URL props in rendered control state", () => {
    navigation.query = "search=Maryam&status=all";

    const markup = renderToStaticMarkup(
      <ListPeopleFilters
        initialSearch="Maryam"
        initialStatus="all"
        hasCriteria
      />,
    );

    expect(markup).toContain('value="Maryam"');
    expect(markup).toMatch(/<option value="all" selected="">همه<\/option>/);
  });

  it("offers no clear affordance while no criteria are applied", () => {
    const markup = renderToStaticMarkup(
      <ListPeopleFilters
        initialSearch=""
        initialStatus="active"
        hasCriteria={false}
      />,
    );

    expect(markup).not.toContain("پاک کردن");
  });

  it("searches without a submit control", () => {
    const markup = renderToStaticMarkup(
      <ListPeopleFilters
        initialSearch=""
        initialStatus="active"
        hasCriteria={false}
      />,
    );

    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("<form");
  });
});
