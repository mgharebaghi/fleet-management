import { describe, expect, it } from "vitest";
import { parseWarehouseListParams, warehousePageHref } from "./warehouse-list-navigation";

describe("warehouse list URL", () => {
  it("selects safe defaults for malformed filters and page values", () => {
    expect(parseWarehouseListParams({ active: "bad", page: "-1" })).toEqual({ search: "", active: "active", page: 1 });
    expect(parseWarehouseListParams({ search: ["first", "second"], active: "all", page: "2000000" })).toEqual({ search: "first", active: "all", page: 1_000_000 });
  });
  it("preserves unrelated and repeated parameters when paging", () => {
    const result = new URL(warehousePageHref({ search: "Main", active: "inactive", tag: ["a", "b"], page: "2" }, 3), "https://example.test");
    expect(result.pathname).toBe("/inventory/warehouses");
    expect(result.searchParams.get("search")).toBe("Main");
    expect(result.searchParams.get("active")).toBe("inactive");
    expect(result.searchParams.getAll("tag")).toEqual(["a", "b"]);
    expect(result.searchParams.get("page")).toBe("3");
  });
});
