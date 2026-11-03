import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveWarehouseAction } from "./save-warehouse.action";

const mocks = vi.hoisted(() => ({ saveWarehouse: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../../composition/inventory-reference.factory", () => ({ makeManageInventoryReferences: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
const previous = { status: "idle" } as const;
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.saveWarehouse.mockResolvedValue({ success: true, value: { id: 3, code: "MAIN", name: "Main", location: null, isActive: true } });
  mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
});

describe("warehouse form transport", () => {
  it("redirects only after saving and invalidating the warehouse list/detail/edit", async () => {
    await expect(saveWarehouseAction(null, previous, form({ code: "MAIN", name: "Main", location: "Place" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.saveWarehouse).toHaveBeenCalledWith({ id: null, code: "MAIN", name: "Main", location: "Place", isActive: true });
    expect(mocks.revalidate.mock.calls.map(call => call[0])).toEqual(["/inventory/warehouses", "/inventory/warehouses/3", "/inventory/warehouses/3/edit"]);
    expect(mocks.redirect).toHaveBeenCalledWith("/inventory/warehouses/3");
  });
  it("preserves warehouse validation state without redirecting", async () => {
    mocks.saveWarehouse.mockResolvedValue({ success: false, error: { type: "DUPLICATE_CODE" } });
    expect(await saveWarehouseAction(3, previous, form({ code: "MAIN", name: "Main", isActive: "on" }))).toEqual({ status: "failed", error: { type: "DUPLICATE_CODE" } });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("rejects uploaded files before Application and returns safe persistence failures", async () => {
    const data = form({ code: "MAIN", name: "Main" });
    data.set("location", new File(["x"], "location.txt"));
    expect(await saveWarehouseAction(null, previous, data)).toEqual({ status: "invalid_form" });
    expect(mocks.saveWarehouse).not.toHaveBeenCalled();
    mocks.saveWarehouse.mockRejectedValue(new Error("synthetic-private-driver-error"));
    expect(await saveWarehouseAction(null, previous, form({ code: "MAIN", name: "Main" }))).toEqual({ status: "unavailable" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
