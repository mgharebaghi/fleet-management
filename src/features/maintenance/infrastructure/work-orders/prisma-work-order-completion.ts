import { Prisma } from "../../../../generated/prisma/client";
import type { CompletionPlan, CompletionReading, WorkOrderCompletionContext, WorkOrderCompletionWrite } from "../../application/work-orders/work-order-completion-records";
export function readCompletionReadings(client: Prisma.TransactionClient, vehicleId: number): Promise<CompletionReading[]> {
  return client.$queryRaw<CompletionReading[]>`SELECT MeterReadingId id,CONVERT(varchar(50),ReadingDate AT TIME ZONE 'Iran Standard Time',127) recordedAt,
    CONVERT(varchar(40),Odometer) odometer,CONVERT(varchar(40),EngineHour) engineHours FROM fleet.VehicleMeterReading WHERE VehicleId=${vehicleId} ORDER BY ReadingDate,MeterReadingId`;
}
export async function readCompletionContext(client: Prisma.TransactionClient, vehicleId: number, planId: number | null): Promise<WorkOrderCompletionContext> {
  const [[clock], plans, readings] = await Promise.all([
    client.$queryRaw<Array<{ now: string }>>`SELECT CONVERT(varchar(50),SYSDATETIME() AT TIME ZONE 'Iran Standard Time',127) [now]`,
    planId === null ? [] : client.$queryRaw<CompletionPlan[]>`SELECT MaintenancePlanId id,VehicleId vehicleId,MaintenanceTypeId typeId,
      CONVERT(bit,CASE WHEN IntervalKm>0 THEN 1 ELSE 0 END) needsOdometer,CONVERT(bit,CASE WHEN IntervalEngineHours>0 THEN 1 ELSE 0 END) needsEngineHours,
      CONVERT(varchar(10),LastServiceDate,23) lastDate,CONVERT(varchar(40),LastServiceOdometer) lastOdometer,CONVERT(varchar(40),LastServiceEngineHour) lastEngineHours
      FROM maintenance.MaintenancePlan WHERE MaintenancePlanId=${planId}`,
    planId === null ? [] : readCompletionReadings(client, vehicleId),
  ]);
  return { now: clock.now, plan: plans[0] ?? null, readings };
}
export async function writeOrderCompletion(client: Prisma.TransactionClient, id: number, value: WorkOrderCompletionWrite) {
  await client.$executeRaw`UPDATE maintenance.WorkOrder SET Status=N'Completed',FinalDescription=${value.result},ActualEndDateTime=CONVERT(datetime2,CONVERT(datetimeoffset,${value.endedAt}) AT TIME ZONE 'Iran Standard Time') WHERE WorkOrderId=${id}`;
  if (value.planBaseline) {
    const baseline = value.planBaseline;
    await client.$executeRaw`UPDATE maintenance.MaintenancePlan SET LastServiceDate=CONVERT(date,CONVERT(datetimeoffset,${value.endedAt}) AT TIME ZONE 'Iran Standard Time'),
      LastServiceOdometer=COALESCE(CONVERT(decimal(18,2),${baseline.odometer}),LastServiceOdometer),
      LastServiceEngineHour=COALESCE(CONVERT(decimal(18,2),${baseline.engineHours}),LastServiceEngineHour) WHERE MaintenancePlanId=${baseline.id}`;
  }
}
