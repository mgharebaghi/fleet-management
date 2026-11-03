import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageInventoryReferences } from "../../application/reference-data/manage-inventory-references";
import { ReadInventoryReferences } from "../../application/reference-data/read-inventory-references";
import { InventoryUnitInUseError, InventoryCategoryInUseError, InventoryWarehouseInUseError } from "../../application/reference-data/inventory-reference-repository";
import { PrismaInventoryReferenceRepository } from "./prisma-inventory-reference-repository";

const config = loadTestDatabaseConfig("TEST_DATABASE");
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const repository = new PrismaInventoryReferenceRepository(client);
const manage = new ManageInventoryReferences(repository);
const reader = new ReadInventoryReferences(repository);
const ids = { units: new Set<number>(), categories: new Set<number>(), warehouses: new Set<number>(), parts: new Set<number>() };
let verified = false;
const name = () => `IT-${randomUUID()}`;

async function createUnit(value = name()) {
  const result = await manage.saveUnit({ id: null, name: value, symbol: null });
  if (!result.success) throw new Error(`Unit fixture failed: ${result.error.type}`);
  ids.units.add(result.value.id);
  return result.value;
}

describe.sequential("inventory reference SQL Server persistence", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ databaseName: string; unitTable: number | null; categoryTable: number | null; warehouseTable: number | null; partTable: number | null }>>`
      SELECT DB_NAME() databaseName, OBJECT_ID(N'inventory.Unit') unitTable,
        OBJECT_ID(N'inventory.PartCategory') categoryTable,
        OBJECT_ID(N'inventory.Warehouse') warehouseTable, OBJECT_ID(N'inventory.Part') partTable
    `;
    if (!identity || identity.databaseName.toLowerCase() !== config.database.toLowerCase() || !identity.unitTable || !identity.categoryTable || !identity.warehouseTable || !identity.partTable) throw new Error("Inventory IntegrationTest identity or contract is invalid.");
    verified = true;
  }, 45_000);

  afterEach(async () => {
    if (!verified) return;
    await client.stockTransaction.deleteMany({ where: { WarehouseId: { in: [...ids.warehouses] } } });
    await client.part.deleteMany({ where: { PartId: { in: [...ids.parts] } } });
    await client.warehouse.deleteMany({ where: { WarehouseId: { in: [...ids.warehouses] } } });
    await client.partCategory.deleteMany({ where: { PartCategoryId: { in: [...ids.categories] } } });
    await client.unit.deleteMany({ where: { UnitId: { in: [...ids.units] } } });
    for (const set of Object.values(ids)) set.clear();
  }, 45_000);
  afterAll(async () => { await client.$disconnect(); });

  it("deletes unused warehouses but preserves zero-balance history through deactivation and reactivation", async () => {
    const unused = await manage.saveWarehouse({ id: null, code: name(), name: name(), location: "Original location", isActive: true });
    if (!unused.success) throw new Error("Warehouse fixture failed");
    ids.warehouses.add(unused.value.id);
    expect((await reader.warehouses({ search: unused.value.code, active: "all", page: 1 })).warehouses[0].hasStockHistory).toBe(false);
    expect(await manage.deleteWarehouse(unused.value.id)).toEqual({ success: true, value: unused.value.id });
    const used = await manage.saveWarehouse({ id: null, code: name(), name: name(), location: "Original location", isActive: true });
    if (!used.success) throw new Error("Warehouse fixture failed");
    ids.warehouses.add(used.value.id);
    const unit = await createUnit();
    const part = await client.part.create({ data: { PartCode: name(), PartName: name(), UnitId: unit.id } });
    ids.parts.add(part.PartId);
    await client.stockTransaction.createMany({ data: ["Receipt", "Issue"].map(TransactionType => ({ WarehouseId: used.value.id, PartId: part.PartId, TransactionType, Quantity: 1 })) });
    expect((await reader.warehouses({ search: used.value.code, active: "all", page: 1 })).warehouses[0].hasStockHistory).toBe(true);
    expect(await manage.deleteWarehouse(used.value.id)).toEqual({ success: false, error: { type: "WAREHOUSE_IN_USE" } });
    await expect(repository.atomic(session => session.deleteWarehouse(used.value.id))).rejects.toBeInstanceOf(InventoryWarehouseInUseError);
    expect(await manage.setWarehouseActive(used.value.id, false)).toEqual({ success: true, value: { ...used.value, isActive: false } });
    expect(await client.stockTransaction.count({ where: { WarehouseId: used.value.id } })).toBe(2);
    expect(await manage.setWarehouseActive(used.value.id, true)).toEqual({ success: true, value: used.value });
  }, 90000);

  it("preserves unit symbol, trims names and excludes its own ID when updating", async () => {
    const unit = await createUnit();
    const updated = await manage.saveUnit({ id: unit.id, name: ` ${unit.name} `, symbol: " kg " });
    expect(updated).toEqual({ success: true, value: { ...unit, symbol: "kg" } });
    expect(await reader.units()).toContainEqual({ ...unit, symbol: "kg" });
    expect(await client.unit.findUnique({ where: { UnitId: unit.id } })).toEqual({ UnitId: unit.id, UnitName: unit.name, Symbol: "kg" });
  }, 45_000);

  it("prevents deletion through both Application checks and the real FK, while retaining related data", async () => {
    const unit = await createUnit();
    const part = await client.part.create({ data: { PartCode: name(), PartName: name(), UnitId: unit.id } });
    ids.parts.add(part.PartId);
    expect(await manage.deleteUnit(unit.id)).toEqual({ success: false, error: { type: "UNIT_IN_USE" } });
    await expect(repository.atomic(session => session.deleteUnit(unit.id))).rejects.toBeInstanceOf(InventoryUnitInUseError);
    expect(await client.part.count({ where: { PartId: part.PartId } })).toBe(1);
    expect(await client.unit.count({ where: { UnitId: unit.id } })).toBe(1);
  }, 45_000);

  it("deletes only an unused unit and reports subsequent edits as not found", async () => {
    const unit = await createUnit();
    expect(await manage.deleteUnit(unit.id)).toEqual({ success: true, value: unit.id });
    expect(await manage.saveUnit(unit)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    expect(await manage.deleteUnit(unit.id)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  }, 45_000);

  it("uses the category SQL active default, preserves deactivation and detects inactive duplicates", async () => {
    const result = await manage.saveCategory({ id: null, name: name(), isActive: true });
    if (!result.success) throw new Error(result.error.type);
    const category = result.value; ids.categories.add(category.id);
    expect(category.isActive).toBe(true);
    const unit = await createUnit();
    const part = await client.part.create({ data: { PartCode: name(), PartName: name(), UnitId: unit.id, PartCategoryId: category.id } });
    ids.parts.add(part.PartId);
    expect(await manage.saveCategory({ ...category, isActive: false })).toEqual({ success: true, value: { ...category, isActive: false } });
    expect(await manage.saveCategory({ id: null, name: ` ${category.name} `, isActive: true })).toEqual({ success: false, error: { type: "DUPLICATE_NAME" } });
    expect(await reader.categories()).toContainEqual({ ...category, isActive: false });
    expect((await client.part.findUnique({ where: { PartId: part.PartId } }))?.PartCategoryId).toBe(category.id);
    expect(await manage.deleteCategory(category.id)).toEqual({ success: false, error: { type: "CATEGORY_IN_USE" } });
    await expect(repository.atomic(session => session.deleteCategory(category.id))).rejects.toBeInstanceOf(InventoryCategoryInUseError);
  }, 45_000);

  it("deletes an unused category and rejects subsequent deletion", async () => {
    const result = await manage.saveCategory({ id: null, name: name(), isActive: true });
    if (!result.success) throw new Error(result.error.type);
    ids.categories.add(result.value.id);
    expect(await manage.deleteCategory(result.value.id)).toEqual({ success: true, value: result.value.id });
    expect(await manage.deleteCategory(result.value.id)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  }, 45_000);

  it("maps warehouse details and finds inactive duplicate codes using the SQL collation", async () => {
    const result = await manage.saveWarehouse({ id: null, code: name(), name: name(), location: "Location", isActive: true });
    if (!result.success) throw new Error(result.error.type);
    const warehouse = result.value; ids.warehouses.add(warehouse.id);
    expect(warehouse.isActive).toBe(true);
    await manage.saveWarehouse({ ...warehouse, isActive: false });
    expect(await reader.warehouse(warehouse.id)).toEqual({ ...warehouse, isActive: false });
    expect(await manage.saveWarehouse({ ...warehouse, id: null, code: warehouse.code.toLowerCase() })).toEqual({ success: false, error: { type: "DUPLICATE_CODE" } });
    expect((await reader.warehouses({ search: warehouse.code, active: "active", page: 1 })).totalCount).toBe(0);
    expect((await reader.warehouses({ search: warehouse.location!, active: "inactive", page: 1 })).warehouses).toContainEqual({ ...warehouse, isActive: false, hasStockHistory: false });
  }, 45_000);

  it("searches warehouse name/code/location and pages without counting only visible rows", async () => {
    const token = name();
    await client.warehouse.createMany({ data: Array.from({ length: 21 }, (_, index) => ({ WarehouseCode: `${token}-${index}`, WarehouseName: `${token} ${index}`, Location: `${token} place` })) });
    const created = await client.warehouse.findMany({ where: { WarehouseCode: { startsWith: token } }, select: { WarehouseId: true } });
    for (const row of created) ids.warehouses.add(row.WarehouseId);
    const first = await reader.warehouses({ search: token, active: "all", page: 1 });
    const second = await reader.warehouses({ search: token, active: "all", page: 2 });
    expect(first.totalCount).toBe(21); expect(first.warehouses).toHaveLength(20);
    expect(second.totalCount).toBe(21); expect(second.warehouses).toHaveLength(1);
    expect(first.warehouses.some(row => row.id === second.warehouses[0].id)).toBe(false);
  }, 45_000);

  it("serializes duplicate check-and-create operations without adding a UNIQUE constraint", async () => {
    const unitName = name();
    const results = await Promise.all([manage.saveUnit({ id: null, name: unitName, symbol: null }), manage.saveUnit({ id: null, name: unitName, symbol: null })]);
    for (const result of results) if (result.success) ids.units.add(result.value.id);
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([{ success: false, error: { type: "DUPLICATE_NAME" } }]);
    expect(await client.unit.count({ where: { UnitName: unitName } })).toBe(1);
  }, 45_000);

  it("rolls back an interrupted write instead of leaving an incomplete reference", async () => {
    const unitName = name();
    await expect(repository.atomic(async session => {
      const unit = await session.saveUnit({ id: null, name: unitName, symbol: null });
      ids.units.add(unit.id);
      throw new Error("Synthetic interruption");
    })).rejects.toThrow("Synthetic interruption");
    expect(await client.unit.count({ where: { UnitName: unitName } })).toBe(0);
  }, 45_000);
});
