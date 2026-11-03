import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { PreparedWorkOrderTask } from "../../application/work-order-tasks/work-order-task-records";
import type { WorkOrderTaskRepository, WorkOrderTaskSession } from "../../application/work-order-tasks/work-order-task-repository";
import { readWorkOrder } from "../work-orders/prisma-work-order-reader";
import { readTaskTechnicians, readWorkTasks } from "./prisma-work-order-task-reader";
class PrismaTaskSession implements WorkOrderTaskSession {
  constructor(private readonly client: Prisma.TransactionClient, private readonly orderId: number) {}
  order() { return readWorkOrder(this.client, this.orderId); }
  async task(id: number) { return (await readWorkTasks(this.client, this.orderId, id))[0] ?? null; }
  async technician(id: number) { return (await readTaskTechnicians(this.client, id))[0] ?? null; }
  async save(input: PreparedWorkOrderTask) {
    const data = { TaskTitle: input.title, TechnicianId: input.technicianId, LaborHours: input.laborHours === null ? null : new Prisma.Decimal(input.laborHours), LaborCost: input.laborCost === null ? null : new Prisma.Decimal(input.laborCost), Status: input.status, Description: input.description };
    if (input.id === null) return (await this.client.workOrderTask.create({ data: { ...data, WorkOrderId: this.orderId }, select: { WorkOrderTaskId: true } })).WorkOrderTaskId;
    await this.client.workOrderTask.update({ where: { WorkOrderTaskId: input.id, WorkOrderId: this.orderId }, data }); return input.id;
  }
  async cancel(id: number) { await this.client.workOrderTask.update({ where: { WorkOrderTaskId: id, WorkOrderId: this.orderId }, data: { Status: "Cancelled" } }); }
  async fillCost(id: number, value: string) { await this.client.workOrderTask.update({ where: { WorkOrderTaskId: id, WorkOrderId: this.orderId, LaborCost: null }, data: { LaborCost: new Prisma.Decimal(value) } }); }
}
export class PrismaWorkOrderTaskRepository implements WorkOrderTaskRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(orderId: number, work: (session: WorkOrderTaskSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      for (const [resource, mode] of [["FleetManagement.Maintenance.ReferenceData", "Shared"], [`FleetManagement.Maintenance.WorkOrder.${orderId}`, "Exclusive"]] as const) {
        const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode=${mode},@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
        if (!lock || lock.result < 0) throw new Error("Work-order task lock could not be acquired.");
      }
      return work(new PrismaTaskSession(transaction, orderId));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  async snapshot(orderId: number) {
    const [order, tasks, technicians] = await Promise.all([readWorkOrder(this.client, orderId), readWorkTasks(this.client, orderId), readTaskTechnicians(this.client)]);
    return order ? { order, tasks, technicians } : null;
  }
}
