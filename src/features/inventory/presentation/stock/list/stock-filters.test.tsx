import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StockSearch } from "../../../application/stock/stock-records";
const navigation = vi.hoisted(() => ({ pathname: "/inventory/movements" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname, useRouter: () => ({ replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
import { StockFilters } from "./stock-filters";
const criteria: StockSearch = { search: "", warehouseId: null, partId: null, type: "", from: "", to: "", page: 1 };
const render = (overrides: Partial<StockSearch> = {}, movements = true) => {
  navigation.pathname = movements ? "/inventory/movements" : "/inventory/stock";
  return renderToStaticMarkup(<StockFilters criteria={{ ...criteria, ...overrides }} references={{ parts: [], warehouses: [] }} movements={movements} />);
};
describe("stock clear-filter visibility", () => {
  it("hides clearing for default values, whitespace searches and pagination alone", () => {
    expect(render()).not.toContain("پاک کردن فیلترها");
    expect(render({}, false)).not.toContain("پاک کردن فیلترها");
    expect(render({ search: "  ", page: 2 })).not.toContain("پاک کردن فیلترها");
  });
  it.each([{ search: "filter" }, { warehouseId: 1 }, { partId: 2 }])("offers clearing for applied search, warehouse or part filters", value => {
    expect(render(value)).toContain('href="/inventory/movements"');
    expect(render(value, false)).toContain('href="/inventory/stock"');
  });
  it.each([{ type: "Issue" }, { from: "2026-11-01" }, { to: "2026-11-02" }])("considers dates and transaction type only in movement history", value => {
    expect(render(value)).toContain("پاک کردن فیلترها");
    expect(render(value, false)).not.toContain("پاک کردن فیلترها");
  });
});
