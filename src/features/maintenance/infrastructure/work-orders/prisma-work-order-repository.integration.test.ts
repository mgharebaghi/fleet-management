import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { ManageMaintenanceRequests } from "../../application/requests/manage-maintenance-requests";
import { PrismaMaintenanceRequestRepository } from "../requests/prisma-maintenance-request-repository";
import { ManageWorkOrders } from "../../application/work-orders/manage-work-orders";
import type { CreateWorkOrderInput, WorkOrderResult } from "../../application/work-orders/work-order-records";
import { PrismaWorkOrderRepository } from "./prisma-work-order-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-WO-${randomUUID().slice(0, 10)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const repository = new PrismaWorkOrderRepository(client), manage = new ManageWorkOrders(repository);
const requests = new ManageMaintenanceRequests(new PrismaMaintenanceRequestRepository(client));
const ids = { vehicle: 0, brand: 0, model: 0, status: 0, type: 0, workshop: 0, plan: 0 };
function input(): CreateWorkOrderInput { return { origin: "Direct", sourceId: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, workLocation: "OnSite", workshopId: null, odometer: "9999999999999999.99", engineHours: "25.10", problem: token, diagnosis: "Initial diagnosis", description: token }; }
function success(result: WorkOrderResult) { if (!result.success) throw new Error(result.error.type); return result.id; }
async function request() {
  const result = await requests.save({ id: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, problem: token, reportedOdometer: "200.01", reportedEngineHours: "25.10", priority: null, description: null });
  if (!result.success) throw new Error(result.error.type); return result.id;
}
describe.sequential("work-order preparation SQL Server contract", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; zone: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() zone`;
    if (identity.name !== config.database || identity.zone !== "Iran Standard Time") throw new Error("Isolated database/time-zone contract differs");
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { BrandId: ids.brand, ModelName: token } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, ModelId: ids.model, VehicleStatusId: ids.status, PlateNoLeftSide: "12", CurrentOdometer: "100.01", CurrentEngineHour: "2.01" } })).VehicleId;
    const result = await new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client)).saveType({ id: null, code: token, name: token, isActive: true, description: null });
    if (!result.success) throw new Error("Type fixture failed"); ids.type = result.value.id;
    ids.workshop = (await client.workshop.create({ data: { WorkshopName: token, WorkshopType: "General", IsActive: true } })).WorkshopId;
    ids.plan = (await client.maintenancePlan.create({ data: { VehicleId: ids.vehicle, MaintenanceTypeId: ids.type, PlanTitle: token, IntervalKm: "500.00", LastServiceOdometer: "10.01", LastServiceEngineHour: "1.01" } })).MaintenancePlanId;
  }, 90000);
  afterAll(async () => {
    try {
      if (ids.vehicle) {
        await client.workOrder.deleteMany({ where: { VehicleId: ids.vehicle } });
        await client.maintenanceRequest.deleteMany({ where: { VehicleId: ids.vehicle } });
        await client.maintenancePlan.deleteMany({ where: { VehicleId: ids.vehicle } });
        await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      }
      if (ids.workshop) await client.workshop.delete({ where: { WorkshopId: ids.workshop } });
      if (ids.type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: ids.type } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
      expect(await client.workOrder.count({ where: { VehicleId: ids.vehicle } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 90000);
  it("preserves DB-managed identity/time, exact decimals, annual numbering and unchanged vehicle meters", async () => {
    const id = success(await manage.create(input())), record = await manage.get(id);
    expect(record).toMatchObject({ origin: "Direct", requestId: null, planId: null, status: "Open", odometer: "9999999999999999.99", engineHours: "25.10", startedAt: null, endedAt: null });
    expect(record!.number).toMatch(/^WO-\d{4}-\d{4}$/);
    expect(Math.abs(Date.now() - new Date(record!.openedAt).getTime())).toBeLessThan(300000);
    const vehicle = await client.vehicle.findUniqueOrThrow({ where: { VehicleId: ids.vehicle } });
    expect(vehicle.CurrentOdometer?.toFixed(2)).toBe("100.01"); expect(vehicle.CurrentEngineHour?.toFixed(2)).toBe("2.01");
    expect(await client.vehicleMeterReading.count({ where: { VehicleId: ids.vehicle } })).toBe(0);
    expect((await manage.list({ search: token, status: "Open", vehicleId: ids.vehicle, page: 1 })).rows.some(row => row.id === id)).toBe(true);
  }, 90000);
  it("creates from request/plan, protects source closure/deletion and leaves the service baseline unchanged", async () => {
    const source = await request();
    const id = success(await manage.create({ ...input(), origin: "Request", sourceId: source }));
    expect(await manage.get(id)).toMatchObject({ origin: "Request", requestId: source, planId: null });
    expect(await requests.remove(source)).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await requests.changeStatus(source, "Completed")).toEqual({ success: false, error: { type: "ORDERS_UNRESOLVED" } });
    const planOrder = success(await manage.create({ ...input(), origin: "Plan", sourceId: ids.plan }));
    expect(await manage.get(planOrder)).toMatchObject({ origin: "Plan", planId: ids.plan, requestId: null });
    expect((await client.maintenancePlan.findUniqueOrThrow({ where: { MaintenancePlanId: ids.plan } })).LastServiceOdometer?.toFixed(2)).toBe("10.01");
    await client.maintenancePlan.update({ where: { MaintenancePlanId: ids.plan }, data: { IsActive: false } });
    expect(await manage.create({ ...input(), origin: "Plan", sourceId: ids.plan })).toEqual({ success: false, error: { type: "SOURCE_UNAVAILABLE" } });
    const closed = await request(); await requests.changeStatus(closed, "Cancelled");
    expect(await manage.create({ ...input(), origin: "Request", sourceId: closed })).toEqual({ success: false, error: { type: "SOURCE_UNAVAILABLE" } });
    expect(await manage.create({ ...input(), origin: "Request", sourceId: source, vehicleId: 2147483647 })).toEqual({ success: false, error: { type: "SOURCE_MISMATCH" } });
  }, 90000);
  it("updates only preparation fields, retains inactive history, blocks closed edits and rolls back interruptions", async () => {
    const id = success(await manage.create({ ...input(), workLocation: "Workshop", workshopId: ids.workshop })), before = await manage.get(id);
    await client.workshop.update({ where: { WorkshopId: ids.workshop }, data: { IsActive: false } });
    expect((await manage.updateDetails(id, { ...input(), workLocation: "Workshop", workshopId: ids.workshop, diagnosis: "Updated diagnosis" })).success).toBe(true);
    expect(await manage.get(id)).toMatchObject({ number: before!.number, openedAt: before!.openedAt, status: "Open", diagnosis: "Updated diagnosis", startedAt: null });
    expect(await manage.create({ ...input(), workLocation: "Workshop", workshopId: ids.workshop })).toEqual({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
    await expect(repository.atomic({ orderId: id }, async session => { await session.updateDetails(id, { ...input(), diagnosis: "Must roll back" }); throw new Error("Interrupted write"); })).rejects.toThrow("Interrupted write");
    expect((await manage.get(id))!.diagnosis).toBe("Updated diagnosis");
    await client.workOrder.update({ where: { WorkOrderId: id }, data: { Status: "Completed" } });
    expect(await manage.updateDetails(id, input())).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
  }, 90000);
  it("serializes annual numbers and competing source closure/order registration", async () => {
    const created = await Promise.all([manage.create(input()), manage.create(input())]);
    const records = await Promise.all(created.map(result => manage.get(success(result))));
    expect(new Set(records.map(record => record!.number)).size).toBe(2);
    const source = await request();
    const [order, closed] = await Promise.all([manage.create({ ...input(), origin: "Request", sourceId: source }), requests.changeStatus(source, "Completed")]);
    expect(Number(order.success) + Number(closed.success)).toBe(1);
    if (!order.success) expect(order.error.type).toBe("SOURCE_UNAVAILABLE");
    if (!closed.success) expect(closed.error.type).toBe("ORDERS_UNRESOLVED");
  }, 90000);
});
