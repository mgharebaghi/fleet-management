import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { WorkOrderPartRepository, WorkOrderPartSession } from "../../application/work-order-parts/work-order-part-repository";
import type { SaveWorkOrderPart } from "../../application/work-order-parts/work-order-part-records";
import { readWorkOrder } from "../work-orders/prisma-work-order-reader";
import { readWorkOrderParts } from "./prisma-work-order-part-reader";
import { PrismaWorkPartCatalog } from "./prisma-work-part-catalog";
class PrismaWorkPartSession implements WorkOrderPartSession {
  readonly catalog: PrismaWorkPartCatalog;
  constructor(private readonly client: Prisma.TransactionClient, private readonly orderId: number) { this.catalog = new PrismaWorkPartCatalog(client); }
  order() { return readWorkOrder(this.client, this.orderId); }
  async item(id: number) { return (await readWorkOrderParts(this.client, this.orderId, id))[0] ?? null; }
  async task(id: number) {
    const row = await this.client.workOrderTask.findFirst({ where: { WorkOrderTaskId: id, WorkOrderId: this.orderId }, select: { WorkOrderTaskId: true, WorkOrderId: true, TaskTitle: true, Status: true } });
    return row ? { id: row.WorkOrderTaskId, orderId: row.WorkOrderId, title: row.TaskTitle, status: row.Status } : null;
  }
  async save(value: SaveWorkOrderPart) {
    const data = { WorkOrderTaskId: value.taskId, PartId: value.partId, Quantity: new Prisma.Decimal(value.quantity), UnitPrice: value.unitPrice === null ? null : new Prisma.Decimal(value.unitPrice), Description: value.description };
    if (value.id === null) return (await this.client.workOrderPart.create({ data: { ...data, WorkOrderId: this.orderId }, select: { WorkOrderPartId: true } })).WorkOrderPartId;
    await this.client.workOrderPart.update({ where: { WorkOrderPartId: value.id, WorkOrderId: this.orderId }, data }); return value.id;
  }
  async delete(id: number) { await this.client.workOrderPart.delete({ where: { WorkOrderPartId: id, WorkOrderId: this.orderId } }); }
  async fillPrice(id: number, value: string) { await this.client.workOrderPart.update({ where: { WorkOrderPartId: id, WorkOrderId: this.orderId, UnitPrice: null }, data: { UnitPrice: new Prisma.Decimal(value) } }); }
}
export class PrismaWorkOrderPartRepository implements WorkOrderPartRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(orderId: number, work: (session: WorkOrderPartSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      for (const [resource, mode] of [["FleetManagement.Inventory.ReferenceData", "Shared"], ["FleetManagement.Maintenance.ReferenceData", "Shared"], [`FleetManagement.Maintenance.WorkOrder.${orderId}`, "Exclusive"]] as const) {
        const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode=${mode},@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
        if (!lock || lock.result < 0) throw new Error("Repair consumption lock could not be acquired.");
      }
      return work(new PrismaWorkPartSession(transaction, orderId));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  async snapshot(orderId: number) {
    const [order, items, tasks, catalog] = await Promise.all([
      readWorkOrder(this.client, orderId), readWorkOrderParts(this.client, orderId),
      this.client.workOrderTask.findMany({ where: { WorkOrderId: orderId }, select: { WorkOrderTaskId: true, WorkOrderId: true, TaskTitle: true, Status: true }, orderBy: { WorkOrderTaskId: "asc" } }),
      new PrismaWorkPartCatalog(this.client).options(),
    ]);
    return order ? { order, items, tasks: tasks.map(row => ({ id: row.WorkOrderTaskId, orderId: row.WorkOrderId, title: row.TaskTitle, status: row.Status })), catalog } : null;
  }
}
