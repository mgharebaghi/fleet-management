import { readCompletionReadings } from "./prisma-work-order-completion";
import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { WorkOrderRepository, WorkOrderWriteSession } from "../../application/work-orders/work-order-repository";
import type { WorkOrderSearch } from "../../application/work-orders/work-order-records";
import { PrismaMaintenanceRequestVehicleReader } from "../requests/prisma-maintenance-request-vehicle-reader";
import { mapWorkOrder, readOrderSources, readWorkOrder, workOrderFrom, workOrderSelect, type WorkOrderRow } from "./prisma-work-order-reader";
import { PrismaWorkOrderWriteSession } from "./prisma-work-order-write-session";
import { lockVehicleDispatch } from "../../../fleet/infrastructure/availability/prisma-vehicle-dispatch-readiness";
export class PrismaWorkOrderRepository implements WorkOrderRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(locks: { vehicleId?: number; orderId?: number; year?: number; requestId?: number; planId?: number }, work: (session: WorkOrderWriteSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      if (locks.vehicleId !== undefined) await lockVehicleDispatch(transaction, [locks.vehicleId]);
      const resources: Array<[string, "Shared" | "Exclusive"]> = [["FleetManagement.Maintenance.ReferenceData", "Shared"]];
      if (locks.year !== undefined) resources.push([`FleetManagement.Maintenance.WorkOrderNo.${locks.year}`, "Exclusive"]);
      if (locks.requestId !== undefined) resources.push([`FleetManagement.Maintenance.Request.${locks.requestId}`, "Exclusive"]);
      if (locks.planId !== undefined) resources.push([`FleetManagement.Maintenance.Plan.${locks.planId}`, "Exclusive"]);
      if (locks.orderId !== undefined) resources.push([`FleetManagement.Maintenance.WorkOrder.${locks.orderId}`, "Exclusive"]);
      for (const [resource, mode] of resources) {
        const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode=${mode},@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
        if (!lock || lock.result < 0) throw new Error("Work-order lock could not be acquired.");
      }
      return work(new PrismaWorkOrderWriteSession(transaction));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  readings(vehicleId: number) { return readCompletionReadings(this.client, vehicleId); }
  get(id: number) { return readWorkOrder(this.client, id); }
  async references() {
    const [vehicles, types, workshops, requests, plans] = await Promise.all([
      new PrismaMaintenanceRequestVehicleReader(this.client).options(), this.client.maintenanceType.findMany({ orderBy: { TypeName: "asc" } }),
      this.client.workshop.findMany({ orderBy: { WorkshopName: "asc" } }), readOrderSources(this.client, "Request"), readOrderSources(this.client, "Plan"),
    ]);
    return { vehicles, types: types.map(row => ({ id: row.MaintenanceTypeId, code: row.TypeCode, name: row.TypeName, isActive: row.IsActive })), workshops: workshops.map(row => ({ id: row.WorkshopId, name: row.WorkshopName, isActive: row.IsActive })), requests, plans };
  }
  async list(search: WorkOrderSearch) {
    const pattern = `%${search.search.replace(/\[/g, "[[]").replace(/%/g, "[%]").replace(/_/g, "[_]")}%`;
    const where = Prisma.sql`WHERE 1=1 ${search.status ? Prisma.sql`AND o.Status COLLATE Latin1_General_100_BIN2=${search.status}` : Prisma.empty}
      ${search.vehicleId ? Prisma.sql`AND o.VehicleId=${search.vehicleId}` : Prisma.empty}
      ${search.search ? Prisma.sql`AND (o.WorkOrderNo LIKE ${pattern} OR v.VehicleCode LIKE ${pattern} OR m.ModelName LIKE ${pattern} OR b.BrandName LIKE ${pattern} OR t.TypeName LIKE ${pattern} OR w.WorkshopName LIKE ${pattern} OR o.ProblemDescription LIKE ${pattern} OR CONCAT(v.PlateNoLeftSide,N' ',v.PlateNoCenterChar,N' ',v.PlateNoRightSide,N' ',v.PlateNoIranNo) LIKE ${pattern})` : Prisma.empty}`;
    const [rows, [count]] = await Promise.all([
      this.client.$queryRaw<WorkOrderRow[]>(Prisma.sql`${workOrderSelect} ${workOrderFrom} ${where} ORDER BY o.WorkOrderId DESC OFFSET ${(search.page - 1) * 20} ROWS FETCH NEXT 20 ROWS ONLY`),
      this.client.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(*) count ${workOrderFrom} ${where}`),
    ]);
    return { rows: rows.map(mapWorkOrder), totalCount: count.count };
  }
}
