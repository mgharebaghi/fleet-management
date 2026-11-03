import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteInventoryUnitAction, deletePartCategoryAction, saveInventoryUnitAction, savePartCategoryAction } from "./inventory-catalog.actions";

const mocks = vi.hoisted(() => ({ saveUnit: vi.fn(), deleteUnit: vi.fn(), saveCategory: vi.fn(), deleteCategory: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../composition/inventory-reference.factory", () => ({ makeManageInventoryReferences: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
const previous = { status: "idle" } as const;
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.saveUnit.mockResolvedValue({ success: true, value: { id: 1, name: "Item", symbol: null } });
  mocks.saveCategory.mockResolvedValue({ success: true, value: { id: 2, name: "Engine", isActive: true } });
  mocks.deleteUnit.mockResolvedValue({ success: true, value: 1 });
});

describe("inventory reference transport", () => {
  it("retains category usage failures and refreshes the list only after successful deletion", async () => {
    mocks.deleteCategory.mockResolvedValue({ success: false, error: { type: "CATEGORY_IN_USE" } });
    expect(await deletePartCategoryAction(2, previous, new FormData())).toEqual({ status: "failed", error: { type: "CATEGORY_IN_USE" } });
    expect(mocks.revalidate).not.toHaveBeenCalled();
    mocks.deleteCategory.mockResolvedValue({ success: true, value: 2 });
    expect(await deletePartCategoryAction(2, previous, new FormData())).toEqual({ status: "saved" });
    expect(mocks.deleteCategory).toHaveBeenCalledWith(2);
    expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/catalogs");
  });
  it("passes only unit fields and does not create an IsActive input contract for Unit", async () => {
    expect(await saveInventoryUnitAction(null, previous, form({ name: "Item", symbol: "kg", isActive: "on" }))).toEqual({ status: "saved" });
    expect(mocks.saveUnit).toHaveBeenCalledWith({ id: null, name: "Item", symbol: "kg" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/inventory/catalogs");
  });
  it("rejects missing strings and uploaded files before calling Application", async () => {
    const data = form({ name: "Item" }); data.set("symbol", new File(["x"], "symbol.txt"));
    expect(await saveInventoryUnitAction(null, previous, data)).toEqual({ status: "invalid_form" });
    expect(await saveInventoryUnitAction(null, previous, new FormData())).toEqual({ status: "invalid_form" });
    expect(mocks.saveUnit).not.toHaveBeenCalled();
  });
  it("uses the bound record ID instead of a forged form ID", async () => {
    await saveInventoryUnitAction(1, previous, form({ name: "Item", id: "999" }));
    expect(mocks.saveUnit).toHaveBeenCalledWith({ id: 1, name: "Item", symbol: null });
  });
  it("maps typed duplicate/validation failures without invalidating a successful list", async () => {
    mocks.saveUnit.mockResolvedValue({ success: false, error: { type: "DUPLICATE_NAME" } });
    expect(await saveInventoryUnitAction(null, previous, form({ name: "Item" }))).toEqual({ status: "failed", error: { type: "DUPLICATE_NAME" } });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("uses a missing checkbox as false only for an existing category", async () => {
    await savePartCategoryAction(null, previous, form({ name: "Engine" }));
    expect(mocks.saveCategory).toHaveBeenLastCalledWith({ id: null, name: "Engine", isActive: true });
    await savePartCategoryAction(2, previous, form({ name: "Engine" }));
    expect(mocks.saveCategory).toHaveBeenLastCalledWith({ id: 2, name: "Engine", isActive: false });
  });
  it("rejects a forged active value instead of silently deactivating a reference", async () => {
    expect(await savePartCategoryAction(2, previous, form({ name: "Engine", isActive: "false" }))).toEqual({ status: "invalid_form" });
    expect(mocks.saveCategory).not.toHaveBeenCalled();
  });
  it("returns a Persian-presentable unavailable state without exposing driver errors", async () => {
    mocks.saveUnit.mockRejectedValue(new Error("synthetic-driver-secret"));
    expect(await saveInventoryUnitAction(null, previous, form({ name: "Item" }))).toEqual({ status: "unavailable" });
  });
  it("retains a typed used-unit failure for the confirmation dialog", async () => {
    mocks.deleteUnit.mockResolvedValue({ success: false, error: { type: "UNIT_IN_USE" } });
    expect(await deleteInventoryUnitAction(1, previous, new FormData())).toEqual({ status: "failed", error: { type: "UNIT_IN_USE" } });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
