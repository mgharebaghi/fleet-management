import { readCompletionContext, writeOrderCompletion } from "./prisma-work-order-completion";
import type { WorkOrderCompletionWrite } from "../../application/work-orders/work-order-completion-records";
import { Prisma } from "../../../../generated/prisma/client";
import type { PreparedWorkOrder, WorkOrderDetailsInput } from "../../application/work-orders/work-order-records";
import type { WorkOrderWriteSession } from "../../application/work-orders/work-order-repository";
import { PrismaMaintenanceRequestVehicleReader } from "../requests/prisma-maintenance-request-vehicle-reader";
import { readOrderSources, readWorkOrder } from "./prisma-work-order-reader";
import { readWorkOrderStartReadiness } from "./prisma-work-order-start-readiness";
function detailData(value: WorkOrderDetailsInput) {
  return { WorkLocationType: value.workLocation, WorkshopId: value.workshopId, ProblemDescription: value.problem, Diagnosis: value.diagnosis, Description: value.description,
    Odometer: value.odometer === null ? null : new Prisma.Decimal(value.odometer), EngineHour: value.engineHours === null ? null : new Prisma.Decimal(value.engineHours) };
}
export class PrismaWorkOrderWriteSession implements WorkOrderWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  completionContext(vehicleId: number, planId: number | null) { return readCompletionContext(this.client, vehicleId, planId); }
  completeOrder(id: number, value: WorkOrderCompletionWrite) { return writeOrderCompletion(this.client, id, value); }
  order(id: number) { return readWorkOrder(this.client, id); }
  startReadiness(vehicleId: number, orderId: number) { return readWorkOrderStartReadiness(this.client, vehicleId, orderId); }
  async startOrder(id: number) { await this.client.$executeRaw`UPDATE maintenance.WorkOrder SET Status=N'InProgress',ActualStartDateTime=SYSDATETIME() WHERE WorkOrderId=${id}`; }
  vehicle(id: number) { return new PrismaMaintenanceRequestVehicleReader(this.client).vehicle(id); }
  async type(id: number) {
    const row = await this.client.maintenanceType.findUnique({ where: { MaintenanceTypeId: id }, select: { MaintenanceTypeId: true, TypeName: true, TypeCode: true, IsActive: true } });
    return row ? { id: row.MaintenanceTypeId, name: row.TypeName, code: row.TypeCode, isActive: row.IsActive } : null;
  }
  async workshop(id: number) {
    const row = await this.client.workshop.findUnique({ where: { WorkshopId: id }, select: { WorkshopId: true, WorkshopName: true, IsActive: true } });
    return row ? { id: row.WorkshopId, name: row.WorkshopName, isActive: row.IsActive } : null;
  }
  async source(kind: "Request" | "Plan", id: number) { return (await readOrderSources(this.client, kind, id))[0] ?? null; }
  async numbers(year: number) {
    const prefix = `WO-${String(year).padStart(4, "0")}-`;
    const rows = await this.client.$queryRaw<Array<{ number: string }>>`SELECT WorkOrderNo number FROM maintenance.WorkOrder WHERE UPPER(LTRIM(RTRIM(WorkOrderNo))) LIKE ${`${prefix}%`}`;
    return rows.map(row => row.number);
  }
  async create(value: PreparedWorkOrder) {
    const row = await this.client.workOrder.create({ data: { ...detailData(value), WorkOrderNo: value.number, Status: "Open", VehicleId: value.vehicleId, MaintenanceTypeId: value.maintenanceTypeId,
      MaintenanceRequestId: value.origin === "Request" ? value.sourceId : null, MaintenancePlanId: value.origin === "Plan" ? value.sourceId : null }, select: { WorkOrderId: true } });
    return row.WorkOrderId;
  }
  async updateDetails(id: number, value: WorkOrderDetailsInput) { await this.client.workOrder.update({ where: { WorkOrderId: id }, data: detailData(value) }); }
  async taskStates(id: number) {
    return (await this.client.workOrderTask.findMany({ where: { WorkOrderId: id }, select: { WorkOrderTaskId: true, Status: true } })).map(row => ({ id: row.WorkOrderTaskId, status: row.Status }));
  }
  async cancelOrder(id: number, value: { reason: string | null; started: boolean; unfinishedTaskIds: number[] }) {
    await this.client.workOrderTask.updateMany({ where: { WorkOrderId: id, WorkOrderTaskId: { in: value.unfinishedTaskIds } }, data: { Status: "Cancelled" } });
    await this.client.$executeRaw`UPDATE maintenance.WorkOrder SET Status=N'Cancelled',FinalDescription=${value.reason},ActualEndDateTime=CASE WHEN ${value.started ? 1 : 0}=1 THEN SYSDATETIME() ELSE ActualEndDateTime END WHERE WorkOrderId=${id}`;
  }
}
