import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { StockRepository, StockWriteSession } from "../../application/stock/stock-repository";
import type { StockBalance, StockMovement, StockMovementInput, StockSearch } from "../../application/stock/stock-records";

// SQL text conversions preserve precision through the MSSQL adapter.
const signed = Prisma.sql`CASE WHEN TransactionType COLLATE Latin1_General_100_BIN2 IN (N'Issue',N'AdjustmentOut') THEN -CAST(Quantity AS decimal(38,2)) ELSE CAST(Quantity AS decimal(38,2)) END`;
const invalid = Prisma.sql`CASE WHEN TransactionType COLLATE Latin1_General_100_BIN2 NOT IN (N'Opening',N'Receipt',N'Issue',N'Return',N'AdjustmentIn',N'AdjustmentOut') OR DATALENGTH(TransactionType)<>DATALENGTH(RTRIM(TransactionType)) OR Quantity<=0 THEN 1 ELSE 0 END`;
class PrismaStockWriteSession implements StockWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  async referencesActive(warehouseId: number, partId: number) {
    const [warehouse, part] = await Promise.all([this.client.warehouse.findUnique({ where: { WarehouseId: warehouseId } }), this.client.part.findUnique({ where: { PartId: partId }, select: { IsActive: true } })]);
    return warehouse?.IsActive === true && part?.IsActive === true;
  }
  async snapshot(warehouseId: number, partId: number) {
    const [row] = await this.client.$queryRaw<Array<{ count: number; balance: string | null }>>(Prisma.sql`SELECT COUNT(*) count,
      CASE WHEN COALESCE(SUM(${invalid}),0)>0 THEN NULL ELSE CONVERT(varchar(80),COALESCE(SUM(${signed}),0)) END balance
      FROM inventory.StockTransaction WHERE WarehouseId=${warehouseId} AND PartId=${partId}`);
    return row;
  }
  async append(value: StockMovementInput) {
    const row = await this.client.stockTransaction.create({ data: { WarehouseId: value.warehouseId, PartId: value.partId, TransactionType: value.type,
      Quantity: new Prisma.Decimal(value.quantity), UnitPrice: value.unitPrice === null ? null : new Prisma.Decimal(value.unitPrice), Description: value.description }, select: { StockTransactionId: true } });
    return String(row.StockTransactionId);
  }
}
function textFilter(search: string) {
  if (!search) return Prisma.empty;
  const pattern = `%${search.replace(/\[/g,"[[]").replace(/%/g,"[%]").replace(/_/g,"[_]")}%`;
  return Prisma.sql`AND (p.PartCode LIKE ${pattern} OR p.PartName LIKE ${pattern} OR u.UnitName LIKE ${pattern} OR w.WarehouseCode LIKE ${pattern} OR w.WarehouseName LIKE ${pattern})`;
}
export class PrismaStockRepository implements StockRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(warehouseId: number, partId: number, work: (session: StockWriteSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      // Shared catalog lock cooperates with reference edit/delete operations;
      // the exclusive pair lock serializes availability checks and appends.
      for (const [resource, mode] of [["FleetManagement.Inventory.ReferenceData", "Shared"], [`FleetManagement.Inventory.Stock.${warehouseId}.${partId}`, "Exclusive"]] as const) {
        const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`DECLARE @result int;
          EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode=${mode},@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
        if (!lock || lock.result < 0) throw new Error("Stock lock could not be acquired.");
      }
      return work(new PrismaStockWriteSession(transaction));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  async references() {
    const [warehouses, parts] = await Promise.all([
      this.client.warehouse.findMany({ orderBy: { WarehouseName: "asc" } }),
      this.client.part.findMany({ select: { PartId: true, PartCode: true, PartName: true, IsActive: true, Unit: { select: { UnitName: true } } }, orderBy: { PartName: "asc" } }),
    ]);
    return { warehouses: warehouses.map(row => ({ id: row.WarehouseId, code: row.WarehouseCode, name: row.WarehouseName, active: row.IsActive })), parts: parts.map(row => ({ id: row.PartId, code: row.PartCode, name: row.PartName, active: row.IsActive, unitName: row.Unit.UnitName })) };
  }
  async movements(criteria: StockSearch) {
    const from = Prisma.sql`FROM inventory.StockTransaction s JOIN inventory.Part p ON p.PartId=s.PartId JOIN inventory.Unit u ON u.UnitId=p.UnitId JOIN inventory.Warehouse w ON w.WarehouseId=s.WarehouseId WHERE 1=1 ${textFilter(criteria.search)}
      ${criteria.warehouseId ? Prisma.sql`AND s.WarehouseId=${criteria.warehouseId}` : Prisma.empty} ${criteria.partId ? Prisma.sql`AND s.PartId=${criteria.partId}` : Prisma.empty}
      ${criteria.type ? Prisma.sql`AND s.TransactionType COLLATE Latin1_General_100_BIN2=${criteria.type}` : Prisma.empty}
      ${criteria.from ? Prisma.sql`AND s.TransactionDate>=CONVERT(datetime2,${criteria.from})` : Prisma.empty}
      ${criteria.to ? Prisma.sql`AND s.TransactionDate<DATEADD(day,1,CONVERT(datetime2,${criteria.to}))` : Prisma.empty}`;
    const [rows, [count]] = await Promise.all([
      this.client.$queryRaw<StockMovement[]>(Prisma.sql`SELECT CONVERT(varchar(30),s.StockTransactionId) id,s.WarehouseId warehouseId,w.WarehouseName warehouseName,w.WarehouseCode warehouseCode,s.PartId partId,p.PartCode partCode,p.PartName partName,u.UnitName unitName,s.TransactionType type,
        CONVERT(varchar(40),s.Quantity) quantity,CONVERT(varchar(40),s.UnitPrice) unitPrice,s.Description description,CONVERT(varchar(50),s.TransactionDate AT TIME ZONE 'Iran Standard Time',127) date ${from}
        ORDER BY s.StockTransactionId DESC OFFSET ${(criteria.page-1)*20} ROWS FETCH NEXT 20 ROWS ONLY`),
      this.client.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(*) count ${from}`),
    ]);
    return { rows, totalCount: count.count };
  }
  async balances(criteria: StockSearch) {
    const cte = Prisma.sql`WITH pairs AS (SELECT WarehouseId,PartId,SUM(${signed}) balance,SUM(${invalid}) invalid FROM inventory.StockTransaction GROUP BY WarehouseId,PartId),
      totals AS (SELECT PartId,SUM(balance) balance,SUM(invalid) invalid,MIN(balance) smallest FROM pairs GROUP BY PartId), selected AS (
        ${criteria.warehouseId ? Prisma.sql`SELECT p.PartId,w.WarehouseId,COALESCE(x.balance,0) balance,COALESCE(x.invalid,0) invalid FROM inventory.Part p CROSS JOIN inventory.Warehouse w LEFT JOIN pairs x ON x.PartId=p.PartId AND x.WarehouseId=w.WarehouseId WHERE w.WarehouseId=${criteria.warehouseId}` : Prisma.sql`SELECT p.PartId,x.WarehouseId,COALESCE(x.balance,0) balance,COALESCE(x.invalid,0) invalid FROM inventory.Part p LEFT JOIN pairs x ON x.PartId=p.PartId`})`;
    const from = Prisma.sql`FROM selected x JOIN inventory.Part p ON p.PartId=x.PartId JOIN inventory.Unit u ON u.UnitId=p.UnitId LEFT JOIN inventory.Warehouse w ON w.WarehouseId=x.WarehouseId LEFT JOIN totals t ON t.PartId=p.PartId WHERE 1=1 ${textFilter(criteria.search)} ${criteria.partId ? Prisma.sql`AND p.PartId=${criteria.partId}` : Prisma.empty}`;
    const [rows, [count]] = await Promise.all([
      this.client.$queryRaw<StockBalance[]>(Prisma.sql`${cte} SELECT x.WarehouseId warehouseId,w.WarehouseCode warehouseCode,w.WarehouseName warehouseName,w.IsActive warehouseActive,p.PartId partId,p.PartCode partCode,p.PartName partName,p.IsActive partActive,u.UnitName unitName,
        CASE WHEN x.invalid>0 OR x.balance<0 THEN NULL ELSE CONVERT(varchar(80),x.balance) END balance,
        CASE WHEN t.invalid>0 OR t.smallest<0 THEN NULL ELSE CONVERT(varchar(80),COALESCE(t.balance,0)) END totalBalance,
        CONVERT(varchar(40),p.MinStock) minStock,CONVERT(varchar(40),p.MaxStock) maxStock,CONVERT(varchar(40),p.ReorderPoint) reorderPoint ${from}
        ORDER BY p.PartId DESC,x.WarehouseId OFFSET ${(criteria.page-1)*20} ROWS FETCH NEXT 20 ROWS ONLY`),
      this.client.$queryRaw<Array<{ count: number }>>(Prisma.sql`${cte} SELECT COUNT(*) count ${from}`),
    ]);
    return { rows, totalCount: count.count };
  }
}
