import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageParts } from "../../application/parts/manage-parts";
import type { PartInput } from "../../application/parts/part-records";
import { PrismaPartRepository } from "./prisma-part-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE");
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const manage = new ManageParts(new PrismaPartRepository(client));
const token = `IT-${randomUUID()}`;
const partIds: number[] = [], unitIds: number[] = [], categoryIds: number[] = [], stockIds: bigint[] = [], warehouseIds: number[] = [];
let base: PartInput;
describe.sequential("part SQL Server persistence", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string }>>`SELECT DB_NAME() name`;
    if (identity?.name !== config.database) throw new Error("Isolated Integration identity mismatch.");
    for (const suffix of ["a", "b"]) { const unit = await client.unit.create({ data: { UnitName: `${token}-${suffix}` } }); unitIds.push(unit.UnitId); }
    const category = await client.partCategory.create({ data: { CategoryName: token } }); categoryIds.push(category.PartCategoryId);
    base = { id: null, code: token, name: token, unitId: unitIds[0], categoryId: category.PartCategoryId, partNumber: "PN-1", manufacturer: "Maker", minStock: "9999999999999999.99", maxStock: null, reorderPoint: "0.01", isActive: true };
  }, 60000);
  afterAll(async () => {
    try {
      await client.stockTransaction.deleteMany({ where: { StockTransactionId: { in: stockIds } } });
      await client.part.deleteMany({ where: { PartId: { in: partIds } } });
      await client.warehouse.deleteMany({ where: { WarehouseId: { in: warehouseIds } } });
      await client.partCategory.deleteMany({ where: { PartCategoryId: { in: categoryIds } } });
      await client.unit.deleteMany({ where: { UnitId: { in: unitIds } } });
      expect(await client.part.count({ where: { PartId: { in: partIds } } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 60000);
  it("saves exact thresholds and maps catalog references without compatibility writes", async () => {
    const result = await manage.save(base); if (!result.success) throw new Error(result.error.type);
    partIds.push(result.id);
    expect(await manage.get(result.id)).toMatchObject({ code: token, minStock: "9999999999999999.99", reorderPoint: "0.01", unitName: `${token}-a`, categoryName: token, compatibleModels: [], isUsed: false });
    expect((await manage.list({ search: "PN-1", active: "active", page: 1 })).parts.some(part => part.id === result.id)).toBe(true);
  }, 60000);
  it("detects inactive code duplicates and excludes the edited part", async () => {
    const id = partIds[0];
    expect((await manage.save({ ...base, id, isActive: false })).success).toBe(true);
    expect(await manage.save({ ...base, code: token.toLowerCase() })).toEqual({ success: false, error: { type: "DUPLICATE_CODE" } });
    expect((await manage.list({ search: token, active: "inactive", page: 1 })).parts.some(part => part.id === id)).toBe(true);
  }, 60000);
  it("allows the existing inactive category and forbids changing a used unit", async () => {
    const id = partIds[0];
    await client.partCategory.update({ where: { PartCategoryId: categoryIds[0] }, data: { IsActive: false } });
    expect((await manage.save({ ...base, id })).success).toBe(true);
    const warehouse = await client.warehouse.create({ data: { WarehouseCode: token, WarehouseName: token } }); warehouseIds.push(warehouse.WarehouseId);
    const movement = await client.stockTransaction.create({ data: { PartId: id, WarehouseId: warehouse.WarehouseId, TransactionType: "Opening", Quantity: 1 } }); stockIds.push(movement.StockTransactionId);
    expect(await manage.save({ ...base, id, unitId: unitIds[1] })).toEqual({ success: false, error: { type: "UNIT_IN_USE" } });
    expect((await manage.get(id))?.isUsed).toBe(true);
    expect(await manage.delete(id)).toEqual({ success: false, error: { type: "PART_IN_USE" } });
    expect(await client.part.count({ where: { PartId: id } })).toBe(1);
  }, 60000);
  it("deletes an unused part without deleting its catalogs", async () => {
    const result = await manage.save({ ...base, code: `${token}-delete`, categoryId: null });
    if (!result.success) throw new Error(result.error.type);
    partIds.push(result.id);
    expect(await manage.delete(result.id)).toEqual({ success: true, id: result.id });
    expect(await manage.get(result.id)).toBeNull();
    expect(await manage.delete(result.id)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    expect(await client.unit.count({ where: { UnitId: unitIds[0] } })).toBe(1);
  }, 60000);
});
