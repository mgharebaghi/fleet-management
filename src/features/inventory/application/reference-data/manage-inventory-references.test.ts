import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageInventoryReferences } from "./manage-inventory-references";
import { ReadInventoryReferences } from "./read-inventory-references";
import { InventoryReferenceNotFoundError, InventoryUnitInUseError, type InventoryReferenceRepository, type InventoryReferenceWriteSession } from "./inventory-reference-repository";

const unit = { id: 1, name: "Item", symbol: null };
const category = { id: 2, name: "Engine", isActive: true };
const warehouse = { id: 3, code: "MAIN", name: "Main", location: null, isActive: true };
const session = {
  unit: vi.fn(), unitNameExists: vi.fn(), saveUnit: vi.fn(), unitIsUsed: vi.fn(), deleteUnit: vi.fn(),
  category: vi.fn(), categoryIsUsed: vi.fn(), deleteCategory: vi.fn(), categoryNameExists: vi.fn(), saveCategory: vi.fn(),
  warehouse: vi.fn(), warehouseCodeExists: vi.fn(), saveWarehouse: vi.fn(), warehouseIsUsed: vi.fn(), deleteWarehouse: vi.fn(), setWarehouseActive: vi.fn(),
} satisfies InventoryReferenceWriteSession;
const repository = {
  atomic: vi.fn(), units: vi.fn(), categories: vi.fn(), warehouse: vi.fn(), warehouses: vi.fn(),
} satisfies InventoryReferenceRepository;
const manage = new ManageInventoryReferences(repository);
const read = new ReadInventoryReferences(repository);

beforeEach(() => {
  vi.resetAllMocks();
  repository.atomic.mockImplementation(work => work(session));
  session.unit.mockResolvedValue(unit); session.category.mockResolvedValue(category); session.warehouse.mockResolvedValue(warehouse);
  session.unitNameExists.mockResolvedValue(false); session.categoryNameExists.mockResolvedValue(false); session.warehouseCodeExists.mockResolvedValue(false);
  session.unitIsUsed.mockResolvedValue(false);
  session.categoryIsUsed.mockResolvedValue(false);
  session.saveUnit.mockResolvedValue(unit); session.saveCategory.mockResolvedValue(category); session.saveWarehouse.mockResolvedValue(warehouse);
});

describe("inventory reference writes", () => {
  it("deletes only unused warehouses, even when a used warehouse currently has zero stock", async () => {
    expect(await manage.deleteWarehouse(3)).toEqual({ success: true, value: 3 });
    session.deleteWarehouse.mockClear(); session.warehouseIsUsed.mockResolvedValue(true);
    expect(await manage.deleteWarehouse(3)).toEqual({ success: false, error: { type: "WAREHOUSE_IN_USE" } });
    expect(session.deleteWarehouse).not.toHaveBeenCalled();
    session.warehouse.mockResolvedValue(null);
    expect(await manage.deleteWarehouse(3)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it("rejects malformed warehouse operations before accessing persistence", async () => {
    expect((await manage.deleteWarehouse(0)).success).toBe(false);
    expect((await manage.setWarehouseActive(-1, false)).success).toBe(false);
    expect((await manage.setWarehouseActive(3, "false" as unknown as boolean)).success).toBe(false);
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("changes only warehouse activity without rewriting its descriptive fields", async () => {
    session.setWarehouseActive.mockResolvedValue({ ...warehouse, isActive: false });
    expect(await manage.setWarehouseActive(3, false)).toEqual({ success: true, value: { ...warehouse, isActive: false } });
    expect(session.setWarehouseActive).toHaveBeenCalledWith(3, false);
    expect(session.saveWarehouse).not.toHaveBeenCalled();
    session.warehouse.mockResolvedValue(null);
    expect(await manage.setWarehouseActive(3, true)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it("deletes only unused categories, preserving referenced categories", async () => {
    expect(await manage.deleteCategory(2)).toEqual({ success: true, value: 2 });
    expect(session.deleteCategory).toHaveBeenCalledWith(2);
    session.deleteCategory.mockClear(); session.categoryIsUsed.mockResolvedValue(true);
    expect(await manage.deleteCategory(2)).toEqual({ success: false, error: { type: "CATEGORY_IN_USE" } });
    expect(session.deleteCategory).not.toHaveBeenCalled();
    session.category.mockResolvedValue(null);
    expect(await manage.deleteCategory(2)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it("trims unit values, normalizes an empty symbol and excludes the current ID from duplicate checks", async () => {
    expect(await manage.saveUnit({ id: 1, name: " Item ", symbol: "  " })).toEqual({ success: true, value: unit });
    expect(session.unitNameExists).toHaveBeenCalledWith("Item", 1);
    expect(session.saveUnit).toHaveBeenCalledWith({ id: 1, name: "Item", symbol: null });
  });
  it.each([
    [{ id: null, name: " ", symbol: null }, "name", "REQUIRED"],
    [{ id: null, name: "x".repeat(51), symbol: null }, "name", "TOO_LONG"],
    [{ id: null, name: "Item", symbol: "x".repeat(21) }, "symbol", "TOO_LONG"],
    [{ id: 0, name: "Item", symbol: null }, "id", "INVALID_ID"],
    [{ id: 2_147_483_648, name: "Item", symbol: null }, "id", "INVALID_ID"],
  ] as const)("rejects invalid unit input before a transaction", async (input, field, code) => {
    expect(await manage.saveUnit(input)).toEqual({ success: false, error: { type: "VALIDATION_ERROR", fields: { [field]: code } } });
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("does not save a duplicate unit", async () => {
    session.unitNameExists.mockResolvedValue(true);
    expect(await manage.saveUnit({ id: null, name: "Item", symbol: null })).toEqual({ success: false, error: { type: "DUPLICATE_NAME" } });
    expect(session.saveUnit).not.toHaveBeenCalled();
  });
  it("does not delete a used unit", async () => {
    session.unitIsUsed.mockResolvedValue(true);
    expect(await manage.deleteUnit(1)).toEqual({ success: false, error: { type: "UNIT_IN_USE" } });
    expect(session.deleteUnit).not.toHaveBeenCalled();
  });
  it("deletes an unused unit and returns a typed failure if it is already gone", async () => {
    expect(await manage.deleteUnit(1)).toEqual({ success: true, value: 1 });
    expect(session.deleteUnit).toHaveBeenCalledWith(1);
    session.unit.mockResolvedValue(null);
    expect(await manage.deleteUnit(1)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it.each([0, -1, 1.2, NaN, 2_147_483_648])("rejects invalid delete ID %s without opening a transaction", async id => {
    expect((await manage.deleteUnit(id)).success).toBe(false);
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("maps final persistence constraints after rolling back the transaction", async () => {
    repository.atomic.mockRejectedValueOnce(new InventoryUnitInUseError());
    expect(await manage.deleteUnit(1)).toEqual({ success: false, error: { type: "UNIT_IN_USE" } });
    repository.atomic.mockRejectedValueOnce(new InventoryReferenceNotFoundError());
    expect(await manage.saveCategory({ id: 2, name: "Engine", isActive: false })).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it("retains category deactivation and normalizes its name", async () => {
    await manage.saveCategory({ id: 2, name: " Engine ", isActive: false });
    expect(session.saveCategory).toHaveBeenCalledWith({ id: 2, name: "Engine", isActive: false });
    expect(session.categoryNameExists).toHaveBeenCalledWith("Engine", 2);
  });
  it("rejects a duplicate category, including an inactive reference", async () => {
    session.categoryNameExists.mockResolvedValue(true);
    expect(await manage.saveCategory({ id: null, name: "Engine", isActive: true })).toEqual({ success: false, error: { type: "DUPLICATE_NAME" } });
    expect(session.saveCategory).not.toHaveBeenCalled();
  });
  it("enforces SQL category length and boolean contract", async () => {
    const result = await manage.saveCategory({ id: null, name: "x".repeat(101), isActive: "false" as unknown as boolean });
    expect(result).toEqual({ success: false, error: { type: "VALIDATION_ERROR", fields: { name: "TOO_LONG", isActive: "INVALID_BOOLEAN" } } });
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("validates required warehouse code/name and SQL lengths before writing", async () => {
    expect(await manage.saveWarehouse({ id: null, code: " ", name: " ", location: "x".repeat(501), isActive: true })).toEqual({ success: false, error: { type: "VALIDATION_ERROR", fields: { code: "REQUIRED", name: "REQUIRED", location: "TOO_LONG" } } });
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("keeps warehouse name non-unique while checking its code across all records", async () => {
    await manage.saveWarehouse({ id: 3, code: " MAIN ", name: " Main ", location: "  ", isActive: false });
    expect(session.warehouseCodeExists).toHaveBeenCalledWith("MAIN", 3);
    expect(session.saveWarehouse).toHaveBeenCalledWith({ id: 3, code: "MAIN", name: "Main", location: null, isActive: false });
    session.warehouseCodeExists.mockResolvedValue(true);
    expect(await manage.saveWarehouse({ ...warehouse, id: null })).toEqual({ success: false, error: { type: "DUPLICATE_CODE" } });
  });
  it("does not convert updates of missing references into creates", async () => {
    session.unit.mockResolvedValue(null); session.category.mockResolvedValue(null); session.warehouse.mockResolvedValue(null);
    for (const result of [await manage.saveUnit(unit), await manage.saveCategory(category), await manage.saveWarehouse(warehouse)]) {
      expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    }
    expect(session.saveUnit).not.toHaveBeenCalled(); expect(session.saveCategory).not.toHaveBeenCalled(); expect(session.saveWarehouse).not.toHaveBeenCalled();
  });
});

describe("inventory reference reads", () => {
  it("normalizes Persian search, clamps paging and supplies a safe active filter", async () => {
    await read.warehouses({ search: "  كد ۱۲  ", active: "invalid" as "active", page: 2_147_483_647 });
    expect(repository.warehouses).toHaveBeenCalledWith({ search: "کد 12", active: "active", page: 1_000_000 });
    await read.warehouses({ search: "", active: "all", page: NaN });
    expect(repository.warehouses).toHaveBeenLastCalledWith({ search: "", active: "all", page: 1 });
  });
  it("rejects invalid record identifiers before persistence", async () => {
    expect(await read.warehouse(0)).toBeNull();
    expect(await read.warehouse(2_147_483_648)).toBeNull();
    expect(repository.warehouse).not.toHaveBeenCalled();
  });
});
