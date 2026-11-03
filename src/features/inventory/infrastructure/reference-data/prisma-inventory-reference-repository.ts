import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type {
  InventoryUnit, PartCategory, Warehouse, SaveInventoryUnit, SavePartCategory, SaveWarehouse,
  WarehouseSearch,
} from "../../application/reference-data/inventory-reference-records";
import {
  InventoryReferenceNotFoundError, InventoryUnitInUseError, InventoryCategoryInUseError, InventoryWarehouseInUseError,
  type InventoryReferenceRepository, type InventoryReferenceWriteSession,
} from "../../application/reference-data/inventory-reference-repository";

const mapUnit = (row: { UnitId: number; UnitName: string; Symbol: string | null }): InventoryUnit => ({ id: row.UnitId, name: row.UnitName, symbol: row.Symbol });
const mapCategory = (row: { PartCategoryId: number; CategoryName: string; IsActive: boolean }): PartCategory => ({ id: row.PartCategoryId, name: row.CategoryName, isActive: row.IsActive });
const mapWarehouse = (row: { WarehouseId: number; WarehouseCode: string; WarehouseName: string; Location: string | null; IsActive: boolean }): Warehouse => ({ id: row.WarehouseId, code: row.WarehouseCode, name: row.WarehouseName, location: row.Location, isActive: row.IsActive });

function mapWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new InventoryReferenceNotFoundError();
  throw error;
}

class PrismaInventoryReferenceWriteSession implements InventoryReferenceWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  async unit(id: number) { const row = await this.client.unit.findUnique({ where: { UnitId: id } }); return row ? mapUnit(row) : null; }
  async unitNameExists(name: string, excludingId: number | null) { return !!await this.client.unit.findFirst({ where: { UnitName: name, ...(excludingId === null ? {} : { UnitId: { not: excludingId } }) }, select: { UnitId: true } }); }
  async saveUnit(input: SaveInventoryUnit) {
    const data = { UnitName: input.name, Symbol: input.symbol };
    try { return mapUnit(input.id === null ? await this.client.unit.create({ data }) : await this.client.unit.update({ where: { UnitId: input.id }, data })); }
    catch (error) { return mapWriteError(error); }
  }
  async unitIsUsed(id: number) { return !!await this.client.part.findFirst({ where: { UnitId: id }, select: { PartId: true } }); }
  async deleteUnit(id: number) {
    try { await this.client.unit.delete({ where: { UnitId: id } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new InventoryUnitInUseError();
      mapWriteError(error);
    }
  }
  async category(id: number) { const row = await this.client.partCategory.findUnique({ where: { PartCategoryId: id } }); return row ? mapCategory(row) : null; }
  async categoryIsUsed(id: number) { return !!await this.client.part.findFirst({ where: { PartCategoryId: id }, select: { PartId: true } }); }
  async deleteCategory(id: number) {
    try { await this.client.partCategory.delete({ where: { PartCategoryId: id } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new InventoryCategoryInUseError();
      mapWriteError(error);
    }
  }
  async categoryNameExists(name: string, excludingId: number | null) { return !!await this.client.partCategory.findFirst({ where: { CategoryName: name, ...(excludingId === null ? {} : { PartCategoryId: { not: excludingId } }) }, select: { PartCategoryId: true } }); }
  async saveCategory(input: SavePartCategory) {
    try {
      return mapCategory(input.id === null
        ? await this.client.partCategory.create({ data: { CategoryName: input.name, ...(input.isActive ? {} : { IsActive: false }) } })
        : await this.client.partCategory.update({ where: { PartCategoryId: input.id }, data: { CategoryName: input.name, IsActive: input.isActive } }));
    } catch (error) { return mapWriteError(error); }
  }
  async warehouse(id: number) { const row = await this.client.warehouse.findUnique({ where: { WarehouseId: id } }); return row ? mapWarehouse(row) : null; }
  async warehouseIsUsed(id: number) { return !!await this.client.stockTransaction.findFirst({ where: { WarehouseId: id }, select: { StockTransactionId: true } }); }
  async deleteWarehouse(id: number) {
    try { await this.client.warehouse.delete({ where: { WarehouseId: id } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new InventoryWarehouseInUseError();
      mapWriteError(error);
    }
  }
  async setWarehouseActive(id: number, isActive: boolean) {
    try { return mapWarehouse(await this.client.warehouse.update({ where: { WarehouseId: id }, data: { IsActive: isActive } })); }
    catch (error) { return mapWriteError(error); }
  }
  async warehouseCodeExists(code: string, excludingId: number | null) { return !!await this.client.warehouse.findFirst({ where: { WarehouseCode: code, ...(excludingId === null ? {} : { WarehouseId: { not: excludingId } }) }, select: { WarehouseId: true } }); }
  async saveWarehouse(input: SaveWarehouse) {
    const data = { WarehouseCode: input.code, WarehouseName: input.name, Location: input.location };
    try {
      return mapWarehouse(input.id === null
        ? await this.client.warehouse.create({ data: { ...data, ...(input.isActive ? {} : { IsActive: false }) } })
        : await this.client.warehouse.update({ where: { WarehouseId: input.id }, data: { ...data, IsActive: input.isActive } }));
    } catch (error) { return mapWriteError(error); }
  }
}

export class PrismaInventoryReferenceRepository implements InventoryReferenceRepository {
  constructor(private readonly client: PrismaClient) {}

  atomic<T>(work: (session: InventoryReferenceWriteSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      // Existing catalogs have no name/code UNIQUE constraints. This lock
      // serializes this application's reference-data check-and-write operations.
      const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`
        DECLARE @result int;
        EXEC @result = sys.sp_getapplock
          @Resource = N'FleetManagement.Inventory.ReferenceData',
          @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS result;
      `;
      if (!lock || lock.result < 0) throw new Error("Inventory reference-data lock could not be acquired.");
      return work(new PrismaInventoryReferenceWriteSession(transaction));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15_000, timeout: 30_000 });
  }

  async units() { return (await this.client.unit.findMany({ orderBy: [{ UnitName: "asc" }, { UnitId: "asc" }] })).map(mapUnit); }
  async categories() { return (await this.client.partCategory.findMany({ orderBy: [{ CategoryName: "asc" }, { PartCategoryId: "asc" }] })).map(mapCategory); }
  async warehouse(id: number) { const row = await this.client.warehouse.findUnique({ where: { WarehouseId: id } }); return row ? mapWarehouse(row) : null; }
  async warehouses(criteria: WarehouseSearch) {
    const search = criteria.search;
    const where: Prisma.WarehouseWhereInput = {
      ...(criteria.active === "all" ? {} : { IsActive: criteria.active === "active" }),
      ...(search ? { OR: [{ WarehouseCode: { contains: search } }, { WarehouseName: { contains: search } }, { Location: { contains: search } }] } : {}),
    };
    const [rows, totalCount] = await Promise.all([
      this.client.warehouse.findMany({ where, include: { StockTransaction: { select: { StockTransactionId: true }, take: 1 } }, orderBy: { WarehouseId: "desc" }, skip: (criteria.page - 1) * 20, take: 20 }),
      this.client.warehouse.count({ where }),
    ]);
    return { warehouses: rows.map(row => ({ ...mapWarehouse(row), hasStockHistory: row.StockTransaction.length > 0 })), totalCount };
  }
}
