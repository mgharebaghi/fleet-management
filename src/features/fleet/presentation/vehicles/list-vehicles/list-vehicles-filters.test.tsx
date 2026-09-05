import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListVehiclesFilters } from "./list-vehicles-filters";

const navigation = vi.hoisted(() => ({
  pathname: "/fleet/vehicles",
  query: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

const statuses = [
  { id: 1, name: "آماده به کار" },
  { id: 2, name: "در تعمیر" },
];

function renderFilters({
  search = "",
  status = "",
  active = "active",
  hasCriteria = false,
} = {}) {
  return renderToStaticMarkup(
    <ListVehiclesFilters
      initialSearch={search}
      initialStatus={status}
      initialActive={active}
      statuses={statuses}
      hasCriteria={hasCriteria}
    />,
  );
}

describe("ListVehiclesFilters", () => {
  beforeEach(() => {
    navigation.pathname = "/fleet/vehicles";
    navigation.query = "";
    navigation.replace.mockReset();
  });

  it("searches live, without a form or a submit control", () => {
    const markup = renderFilters();

    expect(markup).toContain('type="search"');
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("اعمال جستجو و فیلتر");
  });

  it("renders the criteria the URL was resolved to", () => {
    navigation.query = "search=V-1&status=2&active=all";

    const markup = renderFilters({
      search: "V-1",
      status: "2",
      active: "all",
      hasCriteria: true,
    });

    expect(markup).toContain('value="V-1"');
    expect(markup).toMatch(/<option value="2" selected="">در تعمیر<\/option>/);
    expect(markup).toMatch(/<option value="all" selected="">همه<\/option>/);
    expect(markup).toContain('href="/fleet/vehicles"');
  });

  it("offers every operational status as an unfiltered default", () => {
    const markup = renderFilters();

    expect(markup).toMatch(
      /<option value="" selected="">همه وضعیت‌ها<\/option>/,
    );
    expect(markup).toContain("آماده به کار");
  });

  it("hides the clear affordance while no criteria are applied", () => {
    expect(renderFilters()).not.toContain("پاک کردن");
    expect(renderFilters({ hasCriteria: true })).toContain("پاک کردن");
  });
});
