import type { Prisma } from "../../../../generated/prisma/client";
import type { WorkPartCatalogReader } from "../../application/work-order-parts/work-order-part-repository";
export class PrismaWorkPartCatalog implements WorkPartCatalogReader {
  constructor(private readonly client: Prisma.TransactionClient) {}
  private async read(id?: number) {
    const rows = await this.client.part.findMany({ where: id === undefined ? undefined : { PartId: id }, select: { PartId: true, PartCode: true, PartName: true, IsActive: true, Unit: { select: { UnitName: true } } }, orderBy: { PartName: "asc" } });
    return rows.map(row => ({ id: row.PartId, code: row.PartCode, name: row.PartName, unitName: row.Unit.UnitName, isActive: row.IsActive }));
  }
  async part(id: number) { return (await this.read(id))[0] ?? null; }
  options() { return this.read(); }
}
