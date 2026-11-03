import { Prisma } from "../../../../generated/prisma/client";
import type { WorkOrderRecord, WorkOrderSource } from "../../application/work-orders/work-order-records";

export type WorkOrderRow = Omit<WorkOrderRecord, "vehicle" | "type" | "workshop" | "origin"> & {
  vehicleId: number; vehicleCode: string; vehicleActive: boolean; modelName: string; brandName: string;
  plateNoLeftSide: string; plateNoCenterChar: string | null; plateNoRightSide: string | null; plateNoIranNo: string | null;
  typeId: number; typeCode: string; typeName: string; typeActive: boolean; workshopName: string | null; workshopActive: boolean | null;
};
export const workOrderSelect = Prisma.sql`SELECT o.WorkOrderId id,o.WorkOrderNo number,o.Status status,o.WorkLocationType workLocation,o.WorkshopId workshopId,
  o.MaintenanceRequestId requestId,o.MaintenancePlanId planId,COALESCE(p.PlanTitle,CONVERT(nvarchar(20),r.MaintenanceRequestId)) sourceTitle,
  o.ProblemDescription problem,o.Diagnosis diagnosis,o.Description description,o.FinalDescription finalDescription,
  CONVERT(varchar(40),o.Odometer) odometer,CONVERT(varchar(40),o.EngineHour) engineHours,
  CONVERT(varchar(50),o.OpenDateTime AT TIME ZONE 'Iran Standard Time',127) openedAt,
  CONVERT(varchar(50),o.ActualStartDateTime AT TIME ZONE 'Iran Standard Time',127) startedAt,
  CONVERT(varchar(50),o.ActualEndDateTime AT TIME ZONE 'Iran Standard Time',127) endedAt,
  v.VehicleId vehicleId,v.VehicleCode vehicleCode,v.IsActive vehicleActive,m.ModelName modelName,b.BrandName brandName,
  v.PlateNoLeftSide plateNoLeftSide,v.PlateNoCenterChar plateNoCenterChar,v.PlateNoRightSide plateNoRightSide,v.PlateNoIranNo plateNoIranNo,
  t.MaintenanceTypeId typeId,t.TypeCode typeCode,t.TypeName typeName,t.IsActive typeActive,w.WorkshopName workshopName,w.IsActive workshopActive`;
export const workOrderFrom = Prisma.sql`FROM maintenance.WorkOrder o
  JOIN fleet.Vehicle v ON v.VehicleId=o.VehicleId JOIN fleet.VehicleModel m ON m.ModelId=v.ModelId JOIN fleet.VehicleBrand b ON b.BrandId=m.BrandId
  JOIN maintenance.MaintenanceType t ON t.MaintenanceTypeId=o.MaintenanceTypeId LEFT JOIN maintenance.Workshop w ON w.WorkshopId=o.WorkshopId
  LEFT JOIN maintenance.MaintenanceRequest r ON r.MaintenanceRequestId=o.MaintenanceRequestId LEFT JOIN maintenance.MaintenancePlan p ON p.MaintenancePlanId=o.MaintenancePlanId`;
export function mapWorkOrder(row: WorkOrderRow): WorkOrderRecord {
  return {
    id: row.id, number: row.number, status: row.status, workLocation: row.workLocation, workshopId: row.workshopId,
    odometer: row.odometer, engineHours: row.engineHours, problem: row.problem, diagnosis: row.diagnosis, description: row.description, finalDescription: row.finalDescription,
    openedAt: row.openedAt, startedAt: row.startedAt, endedAt: row.endedAt,
    origin: row.requestId !== null && row.planId !== null ? "Unknown" : row.requestId !== null ? "Request" : row.planId !== null ? "Plan" : "Direct",
    requestId: row.requestId, planId: row.planId, sourceTitle: row.sourceTitle,
    vehicle: { id: row.vehicleId, code: row.vehicleCode, isActive: row.vehicleActive, modelName: row.modelName, brandName: row.brandName, plateNoLeftSide: row.plateNoLeftSide, plateNoCenterChar: row.plateNoCenterChar, plateNoRightSide: row.plateNoRightSide, plateNoIranNo: row.plateNoIranNo },
    type: { id: row.typeId, code: row.typeCode, name: row.typeName, isActive: row.typeActive },
    workshop: row.workshopId === null ? null : { id: row.workshopId, name: row.workshopName!, isActive: row.workshopActive! },
  };
}
export async function readWorkOrder(client: Prisma.TransactionClient, id: number) {
  const rows = await client.$queryRaw<WorkOrderRow[]>(Prisma.sql`${workOrderSelect} ${workOrderFrom} WHERE o.WorkOrderId=${id}`);
  return rows[0] ? mapWorkOrder(rows[0]) : null;
}
export async function readOrderSources(client: Prisma.TransactionClient, kind: "Request" | "Plan", id?: number): Promise<WorkOrderSource[]> {
  if (kind === "Request") return client.$queryRaw<WorkOrderSource[]>(Prisma.sql`SELECT MaintenanceRequestId id,VehicleId vehicleId,MaintenanceTypeId maintenanceTypeId,CONVERT(nvarchar(20),MaintenanceRequestId) title,ProblemDescription problem,
    CONVERT(bit,CASE WHEN Status COLLATE Latin1_General_100_BIN2 IN ('Open','InProgress') THEN 1 ELSE 0 END) available,
    CONVERT(varchar(40),ReportedOdometer) odometer,CONVERT(varchar(40),ReportedEngineHour) engineHours FROM maintenance.MaintenanceRequest
    ${id === undefined ? Prisma.empty : Prisma.sql`WHERE MaintenanceRequestId=${id}`} ORDER BY MaintenanceRequestId DESC`);
  return client.$queryRaw<WorkOrderSource[]>(Prisma.sql`SELECT MaintenancePlanId id,VehicleId vehicleId,MaintenanceTypeId maintenanceTypeId,PlanTitle title,Description problem,IsActive available,
    CONVERT(varchar(40),NULL) odometer,CONVERT(varchar(40),NULL) engineHours FROM maintenance.MaintenancePlan
    ${id === undefined ? Prisma.empty : Prisma.sql`WHERE MaintenancePlanId=${id}`} ORDER BY PlanTitle`);
}
