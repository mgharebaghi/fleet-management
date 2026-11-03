import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { CancelWorkOrder } from "../../application/work-orders/cancel-work-order";
import { ManageWorkOrders } from "../../application/work-orders/manage-work-orders";
import { PrismaWorkOrderRepository } from "../work-orders/prisma-work-order-repository";
import { ManageWorkOrderTasks } from "../../application/work-order-tasks/manage-work-order-tasks";
import type { SaveWorkOrderTask, WorkTaskResult } from "../../application/work-order-tasks/work-order-task-records";
import { PrismaWorkOrderTaskRepository } from "./prisma-work-order-task-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-TASK-${randomUUID().slice(0, 8)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const repository = new PrismaWorkOrderTaskRepository(client), manage = new ManageWorkOrderTasks(repository);
const orders = new ManageWorkOrders(new PrismaWorkOrderRepository(client));
const ids = { vehicle: 0, brand: 0, model: 0, status: 0, type: 0, technician: 0, order: 0, otherOrder: 0, cancellationOrder: 0 };
const input = (): SaveWorkOrderTask => ({ id: null, title: token, technicianId: ids.technician, laborHours: "99999999.99", laborCost: "9999999999999999.99", status: "Open", description: token });
function success(result: WorkTaskResult) { if (!result.success) throw new Error(result.error.type); return result.id; }
describe.sequential("work-order task SQL Server persistence", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; zone: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() zone`;
    if (identity.name !== config.database || identity.zone !== "Iran Standard Time") throw new Error("Isolated database or time-zone contract differs");
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { BrandId: ids.brand, ModelName: token } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, ModelId: ids.model, VehicleStatusId: ids.status, PlateNoLeftSide: "12", CurrentOdometer: "100.01" } })).VehicleId;
    const type = await new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client)).saveType({ id: null, code: token, name: token, isActive: true, description: null });
    if (!type.success) throw new Error("Type fixture failed"); ids.type = type.value.id;
    ids.technician = (await client.technician.create({ data: { FirstName: token, LastName: "Technician" } })).TechnicianId;
    for (const key of ["order", "otherOrder"] as const) {
      const result = await orders.create({ origin: "Direct", sourceId: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, workLocation: "OnSite", workshopId: null, odometer: null, engineHours: null, problem: token, diagnosis: null, description: null });
      if (!result.success) throw new Error(result.error.type); ids[key] = result.id;
    }
  }, 90000);
  afterAll(async () => {
    try {
      await client.workOrderTask.deleteMany({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder, ids.cancellationOrder] } } });
      await client.workOrder.deleteMany({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder, ids.cancellationOrder] } } });
      if (ids.technician) await client.technician.delete({ where: { TechnicianId: ids.technician } });
      if (ids.vehicle) await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      if (ids.type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: ids.type } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
      expect(await client.workOrderTask.count({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder, ids.cancellationOrder] } } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 90000);
  it("preserves both decimal precisions, database-managed time and the parent; rejects cross-file writes", async () => {
    const id = success(await manage.save(ids.order, input())), snapshot = await manage.get(ids.order);
    expect(snapshot!.tasks.find(task => task.id === id)).toMatchObject({ laborHours: "99999999.99", laborCost: "9999999999999999.99", status: "Open", technicianId: ids.technician });
    expect(Math.abs(Date.now() - new Date(snapshot!.tasks[0].createdAt).getTime())).toBeLessThan(300000);
    expect(snapshot!.order).toMatchObject({ status: "Open", startedAt: null });
    expect(await manage.save(ids.otherOrder, { ...input(), id })).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
    expect(await manage.cancel(ids.otherOrder, id)).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
    expect((await client.vehicle.findUniqueOrThrow({ where: { VehicleId: ids.vehicle } })).CurrentOdometer?.toFixed(2)).toBe("100.01");
  }, 90000);
  it("rejects invalid execution state and new inactive technicians, retains historical assignments and preserves cancellation costs", async () => {
    const id = success(await manage.save(ids.order, input()));
    expect(await manage.save(ids.order, { ...input(), id, status: "Completed" })).toEqual({ success: false, error: { type: "ORDER_NOT_STARTED" } });
    await client.technician.update({ where: { TechnicianId: ids.technician }, data: { IsActive: false } });
    expect(await manage.save(ids.order, input())).toEqual({ success: false, error: { type: "TECHNICIAN_UNAVAILABLE" } });
    expect((await manage.save(ids.order, { ...input(), id, description: "Retained assignment" })).success).toBe(true);
    expect((await manage.cancel(ids.order, id)).success).toBe(true);
    const task = (await manage.get(ids.order))!.tasks.find(item => item.id === id)!;
    expect(task).toMatchObject({ status: "Cancelled", laborCost: "9999999999999999.99", laborHours: "99999999.99", description: "Retained assignment" });
  }, 90000);
  it("rolls back interrupted edits and fills an unknown closed-file cost once under concurrent writes", async () => {
    const id = success(await manage.save(ids.otherOrder, { ...input(), technicianId: null, laborCost: null }));
    const before = (await manage.get(ids.otherOrder))!.tasks.find(task => task.id === id)!;
    await expect(repository.atomic(ids.otherOrder, async session => { await session.save({ ...input(), id, technicianId: null, title: "Must roll back", status: "Open" }); throw new Error("Interrupted update"); })).rejects.toThrow("Interrupted update");
    expect((await manage.get(ids.otherOrder))!.tasks.find(task => task.id === id)!.title).toBe(before.title);
    await client.workOrder.update({ where: { WorkOrderId: ids.otherOrder }, data: { Status: "Completed" } });
    expect(await manage.save(ids.otherOrder, { ...input(), id })).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
    const results = await Promise.all([manage.fillCost(ids.otherOrder, id, "0.00"), manage.fillCost(ids.otherOrder, id, "12.34")]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([{ success: false, error: { type: "COST_ALREADY_RECORDED" } }]);
    const after = (await manage.get(ids.otherOrder))!.tasks.find(task => task.id === id)!;
    expect(["0.00", "12.34"]).toContain(after.laborCost);
    expect({ ...after, laborCost: before.laborCost }).toEqual(before);
  }, 90000);
  it("serializes file closure with task updates under the existing work-order lock", async () => {
    const id = (await manage.get(ids.order))!.tasks[0].id;
    const result = await Promise.all([
      manage.save(ids.order, { ...input(), id, technicianId: null, title: "Concurrent update" }),
      new PrismaWorkOrderRepository(client).atomic({ orderId: ids.order }, async () => { await client.workOrder.update({ where: { WorkOrderId: ids.order }, data: { Status: "Cancelled" } }); }),
    ]);
    expect(result[0].success || (!result[0].success && result[0].error.type === "ORDER_CLOSED")).toBe(true);
    expect((await manage.get(ids.order))!.order.status).toBe("Cancelled");
    expect(await manage.cancel(ids.order, id)).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
  }, 90000);
  it("cancels a started file atomically with pending tasks, preserves exact costs and serializes task writes", async () => {
    const created = await orders.create({ origin: "Direct", sourceId: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, workLocation: "OnSite", workshopId: null, odometer: null, engineHours: null, problem: token, diagnosis: null, description: null });
    if (!created.success) throw new Error(created.error.type); ids.cancellationOrder = created.id;
    const orderId = created.id, cancellation = new CancelWorkOrder(new PrismaWorkOrderRepository(client));
    const taskInput = { ...input(), technicianId: null, laborCost: "123.45", laborHours: "2.50" };
    const taskId = success(await manage.save(orderId, taskInput));
    const doneId = success(await manage.save(orderId, { ...taskInput, title: "Completed task", laborCost: null }));
    await client.$executeRaw`UPDATE maintenance.WorkOrder SET Status=N'InProgress',ActualStartDateTime=DATEADD(minute,-5,SYSDATETIME()) WHERE WorkOrderId=${orderId}`;
    await client.workOrderTask.update({ where: { WorkOrderTaskId: doneId }, data: { Status: "Completed" } });
    const before = (await manage.get(orderId))!;
    expect(await cancellation.execute(orderId, " ")).toEqual({ success: false, error: "REASON_REQUIRED" });
    expect((await manage.get(orderId))!.order.status).toBe("InProgress");
    const results = await Promise.all([cancellation.execute(orderId, "Stopped safely"), manage.save(orderId, { ...taskInput, id: taskId })]);
    expect(results[0]).toEqual({ success: true });
    expect(results[1].success || (!results[1].success && results[1].error.type === "ORDER_CLOSED")).toBe(true);
    const after = (await manage.get(orderId))!;
    expect(after.order).toMatchObject({ status: "Cancelled", finalDescription: "Stopped safely", startedAt: before.order.startedAt });
    expect(new Date(after.order.endedAt!).getTime()).toBeGreaterThan(new Date(after.order.startedAt!).getTime());
    for (const task of before.tasks) expect(after.tasks.find(item => item.id === task.id)).toEqual({ ...task, status: task.id === taskId ? "Cancelled" : "Completed" });
    expect(await cancellation.execute(orderId, "Again")).toEqual({ success: false, error: "ORDER_CLOSED" });
    expect((await client.vehicle.findUniqueOrThrow({ where: { VehicleId: ids.vehicle } })).CurrentOdometer?.toFixed(2)).toBe("100.01");
  }, 90000);

});
