import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageStock } from "../../application/stock/manage-stock";
import type { StockMovementInput, StockSearch } from "../../application/stock/stock-records";
import { PrismaStockRepository } from "./prisma-stock-repository";

const config = loadTestDatabaseConfig("TEST_DATABASE");
const client = new PrismaClient({ adapter: new PrismaMssql(config), transactionOptions: { maxWait: 15000 } });
const repository = new PrismaStockRepository(client), manage = new ManageStock(repository);
const token = `IT-stock-${randomUUID()}`;
const partIds: number[] = [], warehouseIds: number[] = [];
let unitId: number;
const search: StockSearch = { search: "", warehouseId: null, partId: null, type: "", from: "", to: "", page: 1 };
async function part() {
  const row = await client.part.create({ data: { PartCode: `${token}-${partIds.length}`, PartName: token, UnitId: unitId, MinStock: 2, ReorderPoint: 5 } });
  partIds.push(row.PartId); return row.PartId;
}
const input = (partId: number, type: string, quantity: string, warehouseId = warehouseIds[0]): StockMovementInput => ({ warehouseId, partId, type, quantity, unitPrice: null, description: "Synthetic fixture" });
const balance = (partId: number, warehouseId = warehouseIds[0]) => manage.balances({ ...search, partId, warehouseId });

describe.sequential("stock SQL Server ledger", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; timeZoneId: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() timeZoneId`;
    if (identity.name !== config.database || identity.timeZoneId !== "Iran Standard Time") throw new Error("Isolated stock database or timestamp-zone contract differs.");
    unitId = (await client.unit.create({ data: { UnitName: token } })).UnitId;
    for (const suffix of ["a", "b"]) warehouseIds.push((await client.warehouse.create({ data: { WarehouseCode: `${token}-${suffix}`, WarehouseName: `${token}-${suffix}` } })).WarehouseId);
  }, 60000);
  afterAll(async () => {
    try {
      await client.stockTransaction.deleteMany({ where: { PartId: { in: partIds } } });
      await client.part.deleteMany({ where: { PartId: { in: partIds } } });
      await client.warehouse.deleteMany({ where: { WarehouseId: { in: warehouseIds } } });
      if (unitId) await client.unit.delete({ where: { UnitId: unitId } });
      expect(await client.stockTransaction.count({ where: { PartId: { in: partIds } } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 60000);

  it("posts 10, issues 3, returns 1 and keeps warehouse balances and global totals separate", async () => {
    const id = await part();
    for (const [type, quantity] of [["Opening", "10"], ["Issue", "3"], ["Return", "1"]]) expect((await manage.append(input(id, type, quantity))).success).toBe(true);
    expect(await manage.append(input(id, "Opening", "1"))).toEqual({ success: false, error: { type: "OPENING_EXISTS" } });
    expect((await balance(id)).rows[0]).toMatchObject({ balance: "8.00", totalBalance: "8.00" });
    expect((await manage.append(input(id, "Receipt", "2", warehouseIds[1]))).success).toBe(true);
    expect((await balance(id)).rows[0]).toMatchObject({ balance: "8.00", totalBalance: "10.00" });
    expect((await manage.movements({ ...search, partId: id, type: "Issue" })).totalCount).toBe(1);
    expect((await balance(id)).rows[0].balance).toBe("8.00");
    expect(await manage.append(input(id, "Issue", "8.01"))).toEqual({ success: false, error: { type: "INSUFFICIENT_STOCK" } });
  }, 90000);

  it("serializes competing issues without overselling", async () => {
    const id = await part();
    expect((await manage.append(input(id, "Opening", "10"))).success).toBe(true);
    const results = await Promise.all([manage.append(input(id, "Issue", "7")), manage.append(input(id, "Issue", "7"))]);
    expect(results.filter(row => row.success)).toHaveLength(1);
    expect(results.filter(row => !row.success)).toEqual([{ success: false, error: { type: "INSUFFICIENT_STOCK" } }]);
    expect((await balance(id)).rows[0].balance).toBe("3.00");
    expect(await client.stockTransaction.count({ where: { PartId: id } })).toBe(2);
  }, 90000);

  it("preserves exact decimal precision, database timestamps and string IDs", async () => {
    const id = await part();
    const result = await manage.append({ ...input(id, "Receipt", "9999999999999999.99"), unitPrice: "9999999999999999.99" });
    expect(result.success).toBe(true); if (!result.success) throw new Error("Fixture failed");
    expect(typeof result.id).toBe("string");
    expect((await manage.append(input(id, "Receipt", "0.01"))).success).toBe(true);
    expect((await balance(id)).rows[0].balance).toBe("10000000000000000.00");
    const rows = await manage.movements({ ...search, partId: id });
    const row = rows.rows.find(row => row.id === result.id)!;
    expect(row.unitPrice).toBe("9999999999999999.99");
    expect(row.quantity).toBe("9999999999999999.99");
    expect(row.date).toMatch(/(?:Z|[+-]\d{2}:\d{2})$/);
    expect(Math.abs(Date.now() - new Date(row.date).getTime())).toBeLessThan(300000);
  }, 90000);

  it("reports unknown/invalid legacy movements and blocks dependent writes", async () => {
    const id = await part();
    await client.stockTransaction.create({ data: { PartId: id, WarehouseId: warehouseIds[0], TransactionType: "ExternalUnknown", Quantity: 1 } });
    expect((await balance(id)).rows[0]).toMatchObject({ balance: null, totalBalance: null });
    expect(await manage.append(input(id, "Receipt", "1"))).toEqual({ success: false, error: { type: "INVALID_LEDGER" } });
    const second = await part();
    await client.stockTransaction.create({ data: { PartId: second, WarehouseId: warehouseIds[0], TransactionType: "Receipt", Quantity: 0 } });
    expect((await balance(second)).rows[0].balance).toBeNull();
    const third = await part();
    await client.stockTransaction.create({ data: { PartId: third, WarehouseId: warehouseIds[0], TransactionType: "receipt", Quantity: 1 } });
    expect((await balance(third)).rows[0].balance).toBeNull();
  }, 60000);

  it("rolls back an interrupted append and rejects inactive references", async () => {
    const id = await part();
    await expect(repository.atomic(warehouseIds[0], id, async session => { await session.append(input(id, "Receipt", "1")); throw new Error("Synthetic interruption"); })).rejects.toThrow("Synthetic interruption");
    expect(await client.stockTransaction.count({ where: { PartId: id } })).toBe(0);
    await client.part.update({ where: { PartId: id }, data: { IsActive: false } });
    expect(await manage.append(input(id, "Receipt", "1"))).toEqual({ success: false, error: { type: "REFERENCE_UNAVAILABLE" } });
    expect((await balance(id)).rows[0]).toMatchObject({ balance: "0.00", partActive: false });
  }, 60000);

  it("aggregates the full ledger independently of movement pagination and dates", async () => {
    const id = await part();
    await client.stockTransaction.createMany({ data: Array.from({ length: 21 }, () => ({ WarehouseId: warehouseIds[0], PartId: id, TransactionType: "Receipt", Quantity: 1 })) });
    const page = await manage.movements({ ...search, partId: id, page: 2 });
    expect(page.rows).toHaveLength(1); expect(page.totalCount).toBe(21);
    expect((await manage.movements({ ...search, partId: id, from: "2090-01-01" })).rows).toHaveLength(0);
    expect((await balance(id)).rows[0]).toMatchObject({ balance: "21.00", totalBalance: "21.00" });
  }, 60000);
});
