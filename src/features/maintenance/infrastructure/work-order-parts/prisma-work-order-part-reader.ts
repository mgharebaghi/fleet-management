import { Prisma } from "../../../../generated/prisma/client";
import type { WorkOrderPart } from "../../application/work-order-parts/work-order-part-records";
type PartRow = Omit<WorkOrderPart, "part"> & { catalogId: number | null; code: string | null; name: string | null; unitName: string | null; isActive: boolean | null };
export async function readWorkOrderParts(client: Prisma.TransactionClient, orderId: number, id?: number): Promise<WorkOrderPart[]> {
  const rows = await client.$queryRaw<PartRow[]>(Prisma.sql`SELECT item.WorkOrderPartId id,item.WorkOrderId orderId,item.WorkOrderTaskId taskId,item.PartId partId,
    CONVERT(varchar(40),item.Quantity) quantity,CONVERT(varchar(40),item.UnitPrice) unitPrice,CONVERT(varchar(80),item.TotalPrice) totalPrice,item.Description description,
    CONVERT(varchar(50),item.CreatedAt AT TIME ZONE 'Iran Standard Time',127) createdAt,
    p.PartId catalogId,p.PartCode code,p.PartName name,p.IsActive isActive,u.UnitName unitName
    FROM maintenance.WorkOrderPart item LEFT JOIN inventory.Part p ON p.PartId=item.PartId LEFT JOIN inventory.Unit u ON u.UnitId=p.UnitId
    WHERE item.WorkOrderId=${orderId} ${id === undefined ? Prisma.empty : Prisma.sql`AND item.WorkOrderPartId=${id}`} ORDER BY item.WorkOrderPartId`);
  return rows.map(row => ({ id: row.id, orderId: row.orderId, taskId: row.taskId, partId: row.partId, quantity: row.quantity, unitPrice: row.unitPrice, totalPrice: row.totalPrice, description: row.description, createdAt: row.createdAt,
    part: row.catalogId === null ? null : { id: row.catalogId, code: row.code!, name: row.name!, unitName: row.unitName!, isActive: row.isActive! } }));
}
