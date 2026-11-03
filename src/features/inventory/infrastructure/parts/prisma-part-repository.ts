import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import { PartInUseError, type PartRepository, type PartWriteSession } from "../../application/parts/part-repository";
import type { PartInput, PartRecord, PartSearch } from "../../application/parts/part-records";

class PrismaPartWriteSession implements PartWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  async hasReferences(id: number) {
    const counts = await Promise.all([
      this.client.stockTransaction.count({ where: { PartId: id } }),
      this.client.workOrderPart.count({ where: { PartId: id } }),
      this.client.partVehicleCompatibility.count({ where: { PartId: id } }),
    ]);
    return counts.some(count => count > 0);
  }
  async delete(id: number) {
    try { await this.client.part.delete({ where: { PartId: id } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new PartInUseError();
      throw error;
    }
  }
  async part(id: number) {
    const row = await this.client.part.findUnique({ where: { PartId: id }, select: { UnitId: true, PartCategoryId: true } });
    if (!row) return null;
    const [stock, consumed] = await Promise.all([this.client.stockTransaction.count({ where: { PartId: id } }), this.client.workOrderPart.count({ where: { PartId: id } })]);
    return { unitId: row.UnitId, categoryId: row.PartCategoryId, isUsed: stock > 0 || consumed > 0 };
  }
  async codeExists(code: string, excludingId: number | null) { return !!await this.client.part.findFirst({ where: { PartCode: code, ...(excludingId === null ? {} : { PartId: { not: excludingId } }) }, select: { PartId: true } }); }
  async unitExists(id: number) { return !!await this.client.unit.findUnique({ where: { UnitId: id }, select: { UnitId: true } }); }
  async category(id: number) { const row = await this.client.partCategory.findUnique({ where: { PartCategoryId: id }, select: { IsActive: true } }); return row ? { isActive: row.IsActive } : null; }
  async save(input: PartInput) {
    const decimal = (value: string | null) => value === null ? null : new Prisma.Decimal(value);
    const data = { PartCode: input.code, PartName: input.name, UnitId: input.unitId, PartCategoryId: input.categoryId, PartNumber: input.partNumber, Manufacturer: input.manufacturer, MinStock: decimal(input.minStock), MaxStock: decimal(input.maxStock), ReorderPoint: decimal(input.reorderPoint) };
    const row = input.id === null ? await this.client.part.create({ data: { ...data, ...(input.isActive ? {} : { IsActive: false }) } }) : await this.client.part.update({ where: { PartId: input.id }, data: { ...data, IsActive: input.isActive } });
    return row.PartId;
  }
}

const partSelect = { PartId: true, PartCode: true, PartName: true, UnitId: true, PartCategoryId: true, PartNumber: true, Manufacturer: true, IsActive: true, Unit: { select: { UnitName: true } }, PartCategory: { select: { CategoryName: true, IsActive: true } } } satisfies Prisma.PartSelect;
type PartRow = Prisma.PartGetPayload<{ select: typeof partSelect }>;
type ThresholdRow = { id: number; minStock: string | null; maxStock: string | null; reorderPoint: string | null };

export class PrismaPartRepository implements PartRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(work: (session: PartWriteSession) => Promise<T>) {
    return this.client.$transaction(async client => {
      const [lock] = await client.$queryRaw<Array<{ result: number }>>`
        DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource=N'FleetManagement.Inventory.ReferenceData',
          @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
        SELECT @result AS result;
      `;
      if (!lock || lock.result < 0) throw new Error("Inventory reference lock failed.");
      return work(new PrismaPartWriteSession(client));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  private async map(rows: PartRow[]): Promise<PartRecord[]> {
    if (!rows.length) return [];
    const ids = rows.map(row => row.PartId);
    const [thresholds, stocks, consumed, compatibility] = await Promise.all([
      this.client.$queryRaw<ThresholdRow[]>(Prisma.sql`SELECT PartId id, CONVERT(varchar(40),MinStock) minStock, CONVERT(varchar(40),MaxStock) maxStock, CONVERT(varchar(40),ReorderPoint) reorderPoint FROM inventory.Part WHERE PartId IN (${Prisma.join(ids)})`),
      this.client.stockTransaction.findMany({ where: { PartId: { in: ids } }, select: { PartId: true }, distinct: ["PartId"] }),
      this.client.workOrderPart.findMany({ where: { PartId: { in: ids } }, select: { PartId: true }, distinct: ["PartId"] }),
      this.client.partVehicleCompatibility.findMany({ where: { PartId: { in: ids } }, select: { PartId: true, VehicleModelId: true, Description: true, VehicleModel: { select: { ModelName: true, VehicleBrand: { select: { BrandName: true } } } } } }),
    ]);
    const decimals = new Map(thresholds.map(row => [row.id, row]));
    const used = new Set([...stocks, ...consumed].map(row => row.PartId));
    return rows.map(row => {
      const values = decimals.get(row.PartId);
      if (!values) throw new Error("Part changed while reading exact thresholds.");
      return { id: row.PartId, code: row.PartCode, name: row.PartName, unitId: row.UnitId, categoryId: row.PartCategoryId, partNumber: row.PartNumber, manufacturer: row.Manufacturer, isActive: row.IsActive, unitName: row.Unit.UnitName, categoryName: row.PartCategory?.CategoryName ?? null, categoryIsActive: row.PartCategory?.IsActive ?? null, minStock: values.minStock, maxStock: values.maxStock, reorderPoint: values.reorderPoint, isUsed: used.has(row.PartId), compatibleModels: compatibility.filter(item => item.PartId === row.PartId).map(item => ({ id: item.VehicleModelId, name: `${item.VehicleModel.VehicleBrand.BrandName} ${item.VehicleModel.ModelName}`, description: item.Description })) };
    });
  }
  async get(id: number) { const row = await this.client.part.findUnique({ where: { PartId: id }, select: partSelect }); return row ? (await this.map([row]))[0] : null; }
  async list(criteria: PartSearch) {
    const text = { contains: criteria.search };
    const where: Prisma.PartWhereInput = { ...(criteria.active === "all" ? {} : { IsActive: criteria.active === "active" }), ...(criteria.search ? { OR: [{ PartCode: text }, { PartName: text }, { PartNumber: text }, { Manufacturer: text }, { Unit: { UnitName: text } }, { PartCategory: { CategoryName: text } }] } : {}) };
    const [rows, totalCount] = await Promise.all([this.client.part.findMany({ where, select: partSelect, orderBy: { PartId: "desc" }, skip: (criteria.page - 1) * 20, take: 20 }), this.client.part.count({ where })]);
    return { parts: await this.map(rows), totalCount };
  }
}
