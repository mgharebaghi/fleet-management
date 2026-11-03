import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { MaintenanceRequestInput, MaintenanceRequest, MaintenanceRequestRecord, RequestSearch, RequestStatus, RequestOrder } from "../../application/requests/maintenance-request-records";
import type { MaintenanceRequestRepository, MaintenanceRequestWriteSession } from "../../application/requests/maintenance-request-repository";
import { requestFollowUpFilter } from "./prisma-request-follow-up-filter";
import { PrismaMaintenanceRequestVehicleReader } from "./prisma-maintenance-request-vehicle-reader";

type FlatRequest = Omit<MaintenanceRequest, "vehicle" | "type" | "orderStatuses"> & {
  vehicleId: number; vehicleCode: string; vehicleActive: boolean; modelName: string; brandName: string;
  plateNoLeftSide: string; plateNoCenterChar: string | null; plateNoRightSide: string | null; plateNoIranNo: string | null;
  maintenanceTypeId: number; typeCode: string; typeName: string; typeActive: boolean;
};
const select = Prisma.sql`SELECT r.MaintenanceRequestId id,r.ProblemDescription problem,r.Priority priority,r.Description description,r.Status status,
  CONVERT(varchar(40),r.ReportedOdometer) reportedOdometer,CONVERT(varchar(40),r.ReportedEngineHour) reportedEngineHours,
  CONVERT(varchar(50),r.RequestDateTime AT TIME ZONE 'Iran Standard Time',127) requestedAt,
  v.VehicleId vehicleId,v.VehicleCode vehicleCode,v.IsActive vehicleActive,m.ModelName modelName,b.BrandName brandName,
  v.PlateNoLeftSide plateNoLeftSide,v.PlateNoCenterChar plateNoCenterChar,v.PlateNoRightSide plateNoRightSide,v.PlateNoIranNo plateNoIranNo,
  t.MaintenanceTypeId maintenanceTypeId,t.TypeCode typeCode,t.TypeName typeName,t.IsActive typeActive,
  (SELECT COUNT(*) FROM maintenance.WorkOrder o WHERE o.MaintenanceRequestId=r.MaintenanceRequestId) orderCount`;
const from = Prisma.sql`FROM maintenance.MaintenanceRequest r JOIN fleet.Vehicle v ON v.VehicleId=r.VehicleId JOIN fleet.VehicleModel m ON m.ModelId=v.ModelId JOIN fleet.VehicleBrand b ON b.BrandId=m.BrandId JOIN maintenance.MaintenanceType t ON t.MaintenanceTypeId=r.MaintenanceTypeId`;
function map(row: FlatRequest, orderStatuses: string[]): MaintenanceRequest {
  return { id: row.id, problem: row.problem, priority: row.priority, description: row.description, status: row.status, reportedOdometer: row.reportedOdometer, reportedEngineHours: row.reportedEngineHours, requestedAt: row.requestedAt, orderCount: row.orderCount, orderStatuses,
    vehicle: { id: row.vehicleId, code: row.vehicleCode, isActive: row.vehicleActive, modelName: row.modelName, brandName: row.brandName, plateNoLeftSide: row.plateNoLeftSide, plateNoCenterChar: row.plateNoCenterChar, plateNoRightSide: row.plateNoRightSide, plateNoIranNo: row.plateNoIranNo },
    type: { id: row.maintenanceTypeId, code: row.typeCode, name: row.typeName, isActive: row.typeActive } };
}
async function readRequest(client: Prisma.TransactionClient, id: number): Promise<MaintenanceRequestRecord | null> {
  const [rows, orders, tasks] = await Promise.all([
    client.$queryRaw<FlatRequest[]>(Prisma.sql`${select} ${from} WHERE r.MaintenanceRequestId=${id}`),
    client.$queryRaw<Array<Omit<RequestOrder, "taskTimes">>>`SELECT o.WorkOrderId id,o.WorkOrderNo number,o.Status status,o.Diagnosis diagnosis,o.FinalDescription finalDescription,w.WorkshopName workshopName,
      CONVERT(varchar(50),o.ActualStartDateTime AT TIME ZONE 'Iran Standard Time',127) startedAt,
      CONVERT(varchar(50),o.ActualEndDateTime AT TIME ZONE 'Iran Standard Time',127) endedAt,
      (SELECT COUNT(*) FROM maintenance.WorkOrderTask t WHERE t.WorkOrderId=o.WorkOrderId) taskCount,
      (SELECT COUNT(*) FROM maintenance.WorkOrderTask t WHERE t.WorkOrderId=o.WorkOrderId AND t.Status COLLATE Latin1_General_100_BIN2=N'Completed') completedTaskCount,
      (SELECT COUNT(*) FROM maintenance.WorkOrderPart p WHERE p.WorkOrderId=o.WorkOrderId) partCount
      FROM maintenance.WorkOrder o LEFT JOIN maintenance.Workshop w ON w.WorkshopId=o.WorkshopId WHERE o.MaintenanceRequestId=${id} ORDER BY o.WorkOrderId DESC`,
    client.workOrderTask.findMany({ where: { WorkOrder: { MaintenanceRequestId: id } }, select: { WorkOrderId: true, Status: true, LaborHours: true } }),
  ]);
  return rows[0] ? { ...map(rows[0], orders.map(order => order.status)), orders: orders.map(order => ({ ...order, taskTimes: tasks.filter(task => task.WorkOrderId === order.id).map(task => ({ status: task.Status, hours: task.LaborHours?.toFixed(2) ?? null })) })) } : null;
}
class PrismaRequestWriteSession implements MaintenanceRequestWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  vehicle(id: number) { return new PrismaMaintenanceRequestVehicleReader(this.client).vehicle(id); }
  request(id: number) { return readRequest(this.client, id); }
  async type(id: number) { const row = await this.client.maintenanceType.findUnique({ where: { MaintenanceTypeId: id }, select: { MaintenanceTypeId: true, TypeCode: true, TypeName: true, IsActive: true } }); return row ? { id: row.MaintenanceTypeId, code: row.TypeCode, name: row.TypeName, isActive: row.IsActive } : null; }
  async save(value: MaintenanceRequestInput) {
    const data = { VehicleId: value.vehicleId, MaintenanceTypeId: value.maintenanceTypeId, ProblemDescription: value.problem, Priority: value.priority, Description: value.description,
      ReportedOdometer: value.reportedOdometer === null ? null : new Prisma.Decimal(value.reportedOdometer), ReportedEngineHour: value.reportedEngineHours === null ? null : new Prisma.Decimal(value.reportedEngineHours) };
    const row = value.id === null
      ? await this.client.maintenanceRequest.create({ data: { ...data, Status: "Open" }, select: { MaintenanceRequestId: true } })
      : await this.client.maintenanceRequest.update({ where: { MaintenanceRequestId: value.id }, data, select: { MaintenanceRequestId: true } });
    return row.MaintenanceRequestId;
  }
  async changeStatus(id: number, status: RequestStatus) { await this.client.maintenanceRequest.update({ where: { MaintenanceRequestId: id }, data: { Status: status } }); }
  async remove(id: number) {
    const result = await this.client.maintenanceRequest.deleteMany({ where: { MaintenanceRequestId: id, WorkOrder: { none: {} } } });
    return result.count === 1;
  }
}
function criteria(search: RequestSearch) {
  const pattern = `%${search.search.replace(/\[/g, "[[]").replace(/%/g, "[%]").replace(/_/g, "[_]")}%`;
  return Prisma.sql`WHERE 1=1
    ${requestFollowUpFilter(search.status)}
    ${search.vehicleId ? Prisma.sql`AND r.VehicleId=${search.vehicleId}` : Prisma.empty}
    ${search.maintenanceTypeId ? Prisma.sql`AND r.MaintenanceTypeId=${search.maintenanceTypeId}` : Prisma.empty}
    ${search.search ? Prisma.sql`AND (CONVERT(nvarchar(20),r.MaintenanceRequestId) LIKE ${pattern} OR v.VehicleCode LIKE ${pattern} OR m.ModelName LIKE ${pattern} OR b.BrandName LIKE ${pattern} OR CONCAT(v.PlateNoLeftSide,N' ',v.PlateNoCenterChar,N' ',v.PlateNoRightSide,N' ',v.PlateNoIranNo) LIKE ${pattern} OR t.TypeName LIKE ${pattern} OR t.TypeCode LIKE ${pattern} OR r.Priority LIKE ${pattern} OR r.ProblemDescription LIKE ${pattern})` : Prisma.empty}`;
}
export class PrismaMaintenanceRequestRepository implements MaintenanceRequestRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(id: number | null, work: (session: MaintenanceRequestWriteSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      // Reference edits/deletion take the exclusive counterpart. Future order
      // creation must also take this request lock before attaching an order.
      const locks: Array<[string, "Shared" | "Exclusive"]> = [["FleetManagement.Maintenance.ReferenceData", "Shared"]];
      if (id !== null) locks.push([`FleetManagement.Maintenance.Request.${id}`, "Exclusive"]);
      for (const [resource, mode] of locks) {
        const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode=${mode},@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
        if (!lock || lock.result < 0) throw new Error("Maintenance request lock could not be acquired.");
      }
      return work(new PrismaRequestWriteSession(transaction));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  async references() {
    const [vehicles, types] = await Promise.all([new PrismaMaintenanceRequestVehicleReader(this.client).options(), this.client.maintenanceType.findMany({ orderBy: { TypeName: "asc" } })]);
    return { vehicles, types: types.map(row => ({ id: row.MaintenanceTypeId, code: row.TypeCode, name: row.TypeName, isActive: row.IsActive })) };
  }
  get(id: number) { return readRequest(this.client, id); }
  async list(search: RequestSearch) {
    const where = criteria(search);
    const [rows, [count]] = await Promise.all([
      this.client.$queryRaw<FlatRequest[]>(Prisma.sql`${select} ${from} ${where} ORDER BY r.MaintenanceRequestId DESC OFFSET ${(search.page - 1) * 20} ROWS FETCH NEXT 20 ROWS ONLY`),
      this.client.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(*) count ${from} ${where}`),
    ]);
    const orders = rows.length ? await this.client.workOrder.findMany({ where: { MaintenanceRequestId: { in: rows.map(row => row.id) } }, select: { MaintenanceRequestId: true, Status: true } }) : [];
    return { rows: rows.map(row => map(row, orders.filter(order => order.MaintenanceRequestId === row.id).map(order => order.Status))), totalCount: count.count };
  }
}
