import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { ManageMaintenanceRequests } from "../../application/requests/manage-maintenance-requests";
import type { MaintenanceRequestInput } from "../../application/requests/maintenance-request-records";
import { PrismaMaintenanceRequestRepository } from "./prisma-maintenance-request-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-R-${randomUUID().slice(0, 12)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config), transactionOptions: { maxWait: 15000 } });
const repository = new PrismaMaintenanceRequestRepository(client), manage = new ManageMaintenanceRequests(repository);
const references = new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client));
const ids = { requests: [] as number[], vehicle: 0, model: 0, brand: 0, status: 0, type: 0 };
const search = { search: token, status: "", vehicleId: null, maintenanceTypeId: null, page: 1 };
function input(): MaintenanceRequestInput { return { id: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, problem: token, reportedOdometer: "9999999999999999.99", reportedEngineHours: "0.01", priority: "Free priority", description: token }; }
async function create() { const result = await manage.save(input()); if (!result.success) throw new Error(result.error.type); ids.requests.push(result.id); return result.id; }
describe.sequential("maintenance request SQL Server persistence", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; timeZoneId: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() timeZoneId`;
    if (identity.name !== config.database || identity.timeZoneId !== "Iran Standard Time") throw new Error("Isolated database or time-zone contract differs");
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { ModelName: token, BrandId: ids.brand } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: ids.model, VehicleStatusId: ids.status, CurrentOdometer: "100.01" } })).VehicleId;
    const type = await references.saveType({ id: null, code: token, name: token, description: null, isActive: true }); if (!type.success) throw new Error("Fixture failed"); ids.type = type.value.id;
  }, 60000);
  afterAll(async () => {
    try {
      await client.workOrder.deleteMany({ where: { MaintenanceRequestId: { in: ids.requests } } });
      if (ids.vehicle) {
        await client.maintenanceRequest.deleteMany({ where: { VehicleId: ids.vehicle } });
        await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      }
      if (ids.type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: ids.type } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
      expect(await client.maintenanceRequest.count({ where: { MaintenanceRequestId: { in: ids.requests } } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 60000);
  it("preserves exact readings and SQL-managed times while writing a real Open status", async () => {
    const id = await create(), record = await manage.get(id);
    expect(record).toMatchObject({ status: "Open", reportedOdometer: "9999999999999999.99", reportedEngineHours: "0.01", orderCount: 0 });
    expect(Math.abs(Date.now() - new Date(record!.requestedAt).getTime())).toBeLessThan(300000);
    const current = await client.vehicle.findUniqueOrThrow({ where: { VehicleId: ids.vehicle } });
    expect(current.CurrentOdometer?.toFixed(2)).toBe("100.01");
    expect(await client.vehicleMeterReading.count({ where: { VehicleId: ids.vehicle } })).toBe(0);
    expect((await manage.list(search)).rows.some(row => row.id === id)).toBe(true);
  }, 90000);
  it("deletes only unreferenced requests, preserves linked repair files and rolls back interrupted deletion", async () => {
    const id = await create();
    await expect(repository.atomic(id, async session => { expect(await session.remove(id)).toBe(true); throw new Error("Interrupted deletion"); })).rejects.toThrow("Interrupted deletion");
    expect(await manage.get(id)).not.toBeNull();
    const order = await client.workOrder.create({ data: { VehicleId: ids.vehicle, MaintenanceTypeId: ids.type, MaintenanceRequestId: id, WorkOrderNo: `${token}-delete`, WorkLocationType: "OnSite", Status: "Cancelled" } });
    expect(await manage.remove(id)).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await repository.atomic(id, session => session.remove(id))).toBe(false);
    expect(await client.workOrder.findUnique({ where: { WorkOrderId: order.WorkOrderId } })).not.toBeNull();
    const unused = await create();
    const results = await Promise.all([manage.remove(unused), manage.remove(unused)]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([{ success: false, error: { type: "NOT_FOUND" } }]);
    expect(await manage.get(unused)).toBeNull();
  }, 90000);
  it("projects linked repair stages while preventing independent request changes", async () => {
    const id = await create();
    const order = await client.workOrder.create({ data: { VehicleId: ids.vehicle, MaintenanceTypeId: ids.type, MaintenanceRequestId: id, WorkOrderNo: token, WorkLocationType: "OnSite", Status: "Open" } });
    expect(await manage.changeStatus(id, "Completed")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.changeStatus(id, "Cancelled")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.save({ ...input(), id, vehicleId: 2147483647 })).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.changeStatus(id, "InProgress")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect((await manage.get(id))?.orderStatuses).toEqual(["Open"]);
    await client.workOrder.update({ where: { WorkOrderId: order.WorkOrderId }, data: { Status: "InProgress" } });
    expect((await manage.get(id))?.orderStatuses).toEqual(["InProgress"]);
    expect((await manage.list(search)).rows.find(row => row.id === id)?.orderStatuses).toEqual(["InProgress"]);
    await client.workOrder.update({ where: { WorkOrderId: order.WorkOrderId }, data: { Status: "Cancelled" } });
    expect(await manage.changeStatus(id, "Completed")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.save({ ...input(), id })).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.changeStatus(id, "Open")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect((await manage.get(id))?.orders[0]).toMatchObject({ status: "Cancelled", taskCount: 0, completedTaskCount: 0, partCount: 0, startedAt: null });
    expect((await manage.get(id))?.orders).toHaveLength(1);
  }, 90000);
  it("rolls back interrupted writes and serializes competing close/cancel transitions", async () => {
    const rollbackInput = { ...input(), problem: `${token}-rollback` };
    await expect(repository.atomic(null, async session => { await session.save(rollbackInput); throw new Error("Synthetic interruption"); })).rejects.toThrow("Synthetic interruption");
    expect(await client.maintenanceRequest.count({ where: { ProblemDescription: rollbackInput.problem } })).toBe(0);
    const id = await create();
    const results = await Promise.all([manage.changeStatus(id, "Completed"), manage.changeStatus(id, "Cancelled")]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([{ success: false, error: { type: "REQUEST_CLOSED" } }]);
  }, 90000);
  it("pages the full count, handles inactive references and retains request identity and initial time", async () => {
    await client.maintenanceRequest.createMany({ data: Array.from({ length: 21 }, () => ({ VehicleId: ids.vehicle, MaintenanceTypeId: ids.type, ProblemDescription: `${token}-page`, Status: "Open" })) });
    const page = await manage.list({ ...search, search: `${token}-page`, page: 2 });
    expect(page.totalCount).toBe(21); expect(page.rows).toHaveLength(1);
    const existingId = page.rows[0].id; const before = await manage.get(existingId);
    await client.vehicle.update({ where: { VehicleId: ids.vehicle }, data: { IsActive: false } });
    expect(await manage.save(input())).toEqual({ success: false, error: { type: "VEHICLE_UNAVAILABLE" } });
    await client.maintenanceType.update({ where: { MaintenanceTypeId: ids.type }, data: { IsActive: false } });
    expect((await manage.save({ ...input(), id: existingId, problem: "Updated" })).success).toBe(true);
    const after = await manage.get(existingId); expect(after?.requestedAt).toBe(before?.requestedAt);
    expect(after?.vehicle.isActive).toBe(false); expect(after?.type.isActive).toBe(false);
  }, 90000);
});
