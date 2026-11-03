import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { CompleteWorkOrder } from "../../application/work-orders/complete-work-order";
import { CancelWorkOrder } from "../../application/work-orders/cancel-work-order";
import { PrismaWorkOrderRepository } from "./prisma-work-order-repository";
import { lockVehicleDispatch, PrismaVehicleDispatchReadiness } from "../../../fleet/infrastructure/availability/prisma-vehicle-dispatch-readiness";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-END-${randomUUID().slice(0, 8)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config) }), repository = new PrismaWorkOrderRepository(client), complete = new CompleteWorkOrder(repository);
const ids = { vehicle: 0, type: 0, brand: 0, model: 0, status: 0 };
async function order(planId: number | null = null) {
  const row = await client.workOrder.create({ data: { VehicleId: ids.vehicle, MaintenanceTypeId: ids.type, MaintenancePlanId: planId, WorkLocationType: "OnSite", WorkOrderNo: `${token}-${randomUUID().slice(0, 4)}`, Status: "InProgress" } });
  await client.$executeRaw`UPDATE maintenance.WorkOrder SET ActualStartDateTime=DATEADD(hour,-1,SYSDATETIME()) WHERE WorkOrderId=${row.WorkOrderId}`;
  await client.workOrderTask.create({ data: { WorkOrderId: row.WorkOrderId, TaskTitle: token, Status: "Completed", LaborHours: "2.01", LaborCost: null } });
  return row.WorkOrderId;
}
describe.sequential("work-order completion SQL Server contract", () => {
  beforeAll(async () => {
    const [db] = await client.$queryRaw<Array<{ name: string; zone: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() zone`;
    expect(db).toEqual({ name: config.database, zone: "Iran Standard Time" });
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { BrandId: ids.brand, ModelName: token } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: ids.model, VehicleStatusId: ids.status, CurrentOdometer: "500.01", CurrentEngineHour: "100.01" } })).VehicleId;
    const type = await new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client)).saveType({ id: null, code: token, name: token, isActive: true, description: null }); if (!type.success) throw new Error(type.error.type); ids.type = type.value.id;
  }, 120000);
  afterEach(async () => {
    await client.workOrderTask.deleteMany({ where: { WorkOrder: { VehicleId: ids.vehicle } } });
    await client.workOrder.deleteMany({ where: { VehicleId: ids.vehicle } });
    await client.maintenancePlan.deleteMany({ where: { VehicleId: ids.vehicle } });
    await client.vehicleMeterReading.deleteMany({ where: { VehicleId: ids.vehicle } });
  }, 90000);
  afterAll(async () => {
    try {
      if (ids.vehicle) await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      if (ids.type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: ids.type } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
    } finally { await client.$disconnect(); }
  }, 90000);
  it("records one final result and real time, preserves unknown costs and releases readiness", async () => {
    const id = await order();
    expect(await complete.execute({ id, result: " Repair finished ", readingId: null })).toEqual({ success: true, id });
    const saved = await repository.get(id); expect(saved).toMatchObject({ status: "Completed", finalDescription: "Repair finished" });
    expect(Math.abs(Date.now() - Date.parse(saved!.endedAt!))).toBeLessThan(300000); expect(Date.parse(saved!.endedAt!)).toBeGreaterThan(Date.parse(saved!.startedAt!));
    expect(await complete.execute({ id, result: "Overwrite", readingId: null })).toEqual({ success: false, error: "ORDER_CLOSED" });
    expect((await repository.get(id))!.finalDescription).toBe("Repair finished");
    expect((await client.workOrderTask.findFirstOrThrow({ where: { WorkOrderId: id } })).LaborCost).toBeNull();
    expect(await client.$transaction(async tx => { await lockVehicleDispatch(tx, [ids.vehicle]); return new PrismaVehicleDispatchReadiness(tx, [ids.vehicle]).check([ids.vehicle]); })).toEqual({ available: true });
  }, 120000);
  it("serializes completion against cancellation without overwriting closed history", async () => {
    const id = await order();
    const results = await Promise.all([complete.execute({ id, result: "Completed result", readingId: null }), new CancelWorkOrder(repository).execute(id, "Stopped result")]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    const saved = await repository.get(id); expect(["Completed", "Cancelled"]).toContain(saved!.status);
    expect(saved!.finalDescription).toBe(saved!.status === "Completed" ? "Completed result" : "Stopped result");
  }, 120000);
  it("updates the same service baseline atomically, rolls back interruptions and keeps vehicle meters", async () => {
    const plan = await client.maintenancePlan.create({ data: { VehicleId: ids.vehicle, MaintenanceTypeId: ids.type, PlanTitle: token, IntervalKm: "100", IntervalEngineHours: "10", LastServiceOdometer: "100.01", LastServiceEngineHour: "20.01" } });
    const reading = await client.vehicleMeterReading.create({ data: { VehicleId: ids.vehicle, ReadingDate: new Date("2026-11-01T09:00:00Z"), Odometer: "200.01", EngineHour: "25.10" } });
    const id = await order(plan.MaintenancePlanId);
    await expect(repository.atomic({ vehicleId: ids.vehicle, planId: plan.MaintenancePlanId, orderId: id }, async session => {
      const context = await session.completionContext(ids.vehicle, plan.MaintenancePlanId);
      await session.completeOrder(id, { result: "Rollback", endedAt: context.now, planBaseline: { id: plan.MaintenancePlanId, odometer: "200.01", engineHours: "25.10" } }); throw new Error("Interrupted completion");
    })).rejects.toThrow("Interrupted completion");
    expect((await repository.get(id))!.status).toBe("InProgress"); expect((await client.maintenancePlan.findUniqueOrThrow({ where: { MaintenancePlanId: plan.MaintenancePlanId } })).LastServiceOdometer!.toFixed(2)).toBe("100.01");
    expect(await complete.execute({ id, result: "Service completed", readingId: reading.MeterReadingId })).toEqual({ success: true, id });
    const updated = await client.maintenancePlan.findUniqueOrThrow({ where: { MaintenancePlanId: plan.MaintenancePlanId } });
    expect(updated.LastServiceOdometer!.toFixed(2)).toBe("200.01"); expect(updated.LastServiceEngineHour!.toFixed(2)).toBe("25.10"); expect(updated.LastServiceDate).not.toBeNull();
    const vehicle = await client.vehicle.findUniqueOrThrow({ where: { VehicleId: ids.vehicle } }); expect(vehicle.CurrentOdometer!.toFixed(2)).toBe("500.01"); expect(vehicle.CurrentEngineHour!.toFixed(2)).toBe("100.01"); expect(vehicle.VehicleStatusId).toBe(ids.status);
  }, 180000);
});
