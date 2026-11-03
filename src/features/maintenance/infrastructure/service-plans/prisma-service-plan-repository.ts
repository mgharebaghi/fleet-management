import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { ServicePlan, ServicePlanInput, ServicePlanOrder } from "../../application/service-plans/service-plan-records";
import type { ServicePlanRepository, ServicePlanWriteSession } from "../../application/service-plans/service-plan-repository";
import { PrismaMaintenanceRequestVehicleReader } from "../requests/prisma-maintenance-request-vehicle-reader";
type Row = Omit<ServicePlan, "vehicle" | "type"> & { vehicleCode: string; modelName: string; brandName: string; vehicleActive: boolean; plateNoLeftSide: string; plateNoCenterChar: string | null; plateNoRightSide: string | null; plateNoIranNo: string | null; typeCode: string; typeName: string; typeActive: boolean };
const select = Prisma.sql`SELECT p.MaintenancePlanId id,p.VehicleId vehicleId,p.MaintenanceTypeId maintenanceTypeId,p.PlanTitle title,p.Description description,p.IsActive isActive,
  CONVERT(varchar(40),p.IntervalKm) intervalKm,CONVERT(varchar(40),p.IntervalDays) intervalDays,CONVERT(varchar(40),p.IntervalEngineHours) intervalHours,
  CONVERT(varchar(40),p.WarningKm) warningKm,CONVERT(varchar(40),p.WarningDays) warningDays,CONVERT(varchar(40),p.WarningEngineHours) warningHours,
  CONVERT(varchar(40),p.LastServiceOdometer) lastOdometer,CONVERT(varchar(10),p.LastServiceDate,23) lastDate,CONVERT(varchar(40),p.LastServiceEngineHour) lastHours,
  CONVERT(varchar(40),v.CurrentOdometer) currentOdometer,CONVERT(varchar(40),v.CurrentEngineHour) currentHours,CONVERT(varchar(10),SYSDATETIME(),23) today,
  v.VehicleCode vehicleCode,v.IsActive vehicleActive,v.PlateNoLeftSide plateNoLeftSide,v.PlateNoCenterChar plateNoCenterChar,v.PlateNoRightSide plateNoRightSide,v.PlateNoIranNo plateNoIranNo,
  m.ModelName modelName,b.BrandName brandName,t.TypeCode typeCode,t.TypeName typeName,t.IsActive typeActive,
  (SELECT COUNT(*) FROM maintenance.WorkOrder o WHERE o.MaintenancePlanId=p.MaintenancePlanId) orderCount
  FROM maintenance.MaintenancePlan p JOIN fleet.Vehicle v ON v.VehicleId=p.VehicleId JOIN fleet.VehicleModel m ON m.ModelId=v.ModelId JOIN fleet.VehicleBrand b ON b.BrandId=m.BrandId JOIN maintenance.MaintenanceType t ON t.MaintenanceTypeId=p.MaintenanceTypeId`;
function map(row: Row): ServicePlan {
  return { ...row, vehicle: { id: row.vehicleId, code: row.vehicleCode, brandName: row.brandName, modelName: row.modelName, isActive: row.vehicleActive, plateNoLeftSide: row.plateNoLeftSide, plateNoCenterChar: row.plateNoCenterChar, plateNoRightSide: row.plateNoRightSide, plateNoIranNo: row.plateNoIranNo }, type: { id: row.maintenanceTypeId, code: row.typeCode, name: row.typeName, isActive: row.typeActive } };
}
async function get(client: Prisma.TransactionClient, id: number) { const rows = await client.$queryRaw<Row[]>(Prisma.sql`${select} WHERE p.MaintenancePlanId=${id}`); return rows[0] ? map(rows[0]) : null; }
class WriteSession implements ServicePlanWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  get(id: number) { return get(this.client, id); }
  async vehicleAvailable(id: number) { return (await this.client.vehicle.findUnique({ where: { VehicleId: id }, select: { IsActive: true } }))?.IsActive === true; }
  async typeAvailable(id: number) { return (await this.client.maintenanceType.findUnique({ where: { MaintenanceTypeId: id }, select: { IsActive: true } }))?.IsActive === true; }
  async today() { const [clock] = await this.client.$queryRaw<Array<{ day: string }>>`SELECT CONVERT(varchar(10),SYSDATETIME(),23) day`; return clock.day; }
  async remove(id: number) {
    const result = await this.client.maintenancePlan.deleteMany({ where: { MaintenancePlanId: id, WorkOrder: { none: {} } } });
    return result.count === 1;
  }
  async save(value: ServicePlanInput) {
    const data = { VehicleId: value.vehicleId, MaintenanceTypeId: value.maintenanceTypeId, PlanTitle: value.title, Description: value.description, IsActive: value.isActive,
      IntervalKm: value.intervalKm === null ? null : new Prisma.Decimal(value.intervalKm), IntervalDays: value.intervalDays === null ? null : Number(value.intervalDays), IntervalEngineHours: value.intervalHours === null ? null : new Prisma.Decimal(value.intervalHours),
      WarningKm: value.warningKm === null ? null : new Prisma.Decimal(value.warningKm), WarningDays: value.warningDays === null ? null : Number(value.warningDays), WarningEngineHours: value.warningHours === null ? null : new Prisma.Decimal(value.warningHours),
      LastServiceOdometer: value.lastOdometer === null ? null : new Prisma.Decimal(value.lastOdometer), LastServiceEngineHour: value.lastHours === null ? null : new Prisma.Decimal(value.lastHours), LastServiceDate: value.lastDate === null ? null : new Date(`${value.lastDate}T00:00:00Z`) };
    const row = value.id === null ? await this.client.maintenancePlan.create({ data, select: { MaintenancePlanId: true } }) : await this.client.maintenancePlan.update({ where: { MaintenancePlanId: value.id }, data, select: { MaintenancePlanId: true } });
    return row.MaintenancePlanId;
  }
}
export class PrismaServicePlanRepository implements ServicePlanRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(id: number | null, work: (session: ServicePlanWriteSession) => Promise<T>): Promise<T> {
    return this.client.$transaction(async tx => {
      const resources: Array<[string, "Shared" | "Exclusive"]> = [["FleetManagement.Maintenance.ReferenceData", "Shared"]];
      if (id !== null) resources.push([`FleetManagement.Maintenance.Plan.${id}`, "Exclusive"]);
      for (const [resource, mode] of resources) {
        const [lock] = await tx.$queryRaw<Array<{ result: number }>>`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode=${mode},@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
        if (!lock || lock.result < 0) throw new Error("Service plan lock could not be acquired.");
      }
      return work(new WriteSession(tx));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  get(id: number) { return get(this.client, id); }
  async candidates(search: string, vehicleId: number | null) {
    const pattern = `%${search.replace(/\[/g, "[[]").replace(/%/g, "[%]").replace(/_/g, "[_]")}%`;
    const rows = await this.client.$queryRaw<Row[]>(Prisma.sql`${select} WHERE 1=1 ${vehicleId ? Prisma.sql`AND p.VehicleId=${vehicleId}` : Prisma.empty} ${search ? Prisma.sql`AND (p.PlanTitle LIKE ${pattern} OR v.VehicleCode LIKE ${pattern} OR m.ModelName LIKE ${pattern} OR b.BrandName LIKE ${pattern} OR t.TypeName LIKE ${pattern} OR p.Description LIKE ${pattern})` : Prisma.empty} ORDER BY p.MaintenancePlanId DESC`);
    return rows.map(map);
  }
  orders(id: number) { return this.client.$queryRaw<ServicePlanOrder[]>`SELECT WorkOrderId id,WorkOrderNo number,Status status FROM maintenance.WorkOrder WHERE MaintenancePlanId=${id} ORDER BY WorkOrderId DESC`; }
  async references() {
    const [vehicles, types] = await Promise.all([new PrismaMaintenanceRequestVehicleReader(this.client).options(), this.client.maintenanceType.findMany({ orderBy: { TypeName: "asc" } })]);
    return { vehicles, types: types.map(row => ({ id: row.MaintenanceTypeId, code: row.TypeCode, name: row.TypeName, isActive: row.IsActive })) };
  }
}
