import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageWorkOrderParts } from "../../application/work-order-parts/manage-work-order-parts";
import type { SaveWorkOrderPart, WorkPartResult } from "../../application/work-order-parts/work-order-part-records";
import { ManageWorkOrders } from "../../application/work-orders/manage-work-orders";
import { CancelWorkOrder } from "../../application/work-orders/cancel-work-order";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { PrismaWorkOrderRepository } from "../work-orders/prisma-work-order-repository";
import { ManageParts } from "../../../inventory/application/parts/manage-parts";
import { PrismaPartRepository } from "../../../inventory/infrastructure/parts/prisma-part-repository";
import { PrismaWorkOrderPartRepository } from "./prisma-work-order-part-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-CONS-${randomUUID().slice(0, 8)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const repository = new PrismaWorkOrderPartRepository(client), manage = new ManageWorkOrderParts(repository);
const orders = new ManageWorkOrders(new PrismaWorkOrderRepository(client)), catalog = new ManageParts(new PrismaPartRepository(client));
const ids = { brand: 0, model: 0, status: 0, vehicle: 0, type: 0, unit: 0, otherUnit: 0, part: 0, racePart: 0, warehouse: 0, order: 0, otherOrder: 0, task: 0, otherTask: 0 };
const input = (): SaveWorkOrderPart => ({ id: null, partId: ids.part, taskId: ids.task, quantity: "1.01", unitPrice: "2.03", description: token });
function saved(result: WorkPartResult) { if (!result.success) throw new Error(result.error.type); return result.id; }
describe.sequential("repair consumption SQL Server contract", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; zone: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() zone`;
    if (identity.name !== config.database || identity.zone !== "Iran Standard Time") throw new Error("Isolated database or time zone differs");
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { BrandId: ids.brand, ModelName: token } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: ids.model, VehicleStatusId: ids.status } })).VehicleId;
    const type = await new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client)).saveType({ id: null, code: token, name: token, isActive: true, description: null });
    if (!type.success) throw new Error(type.error.type); ids.type = type.value.id;
    ids.unit = (await client.unit.create({ data: { UnitName: token } })).UnitId;
    ids.otherUnit = (await client.unit.create({ data: { UnitName: `${token}-other` } })).UnitId;
    ids.part = (await client.part.create({ data: { PartCode: token, PartName: token, UnitId: ids.unit } })).PartId;
    ids.racePart = (await client.part.create({ data: { PartCode: `${token}-race`, PartName: token, UnitId: ids.unit } })).PartId;
    ids.warehouse = (await client.warehouse.create({ data: { WarehouseCode: token, WarehouseName: token } })).WarehouseId;
    await client.stockTransaction.create({ data: { WarehouseId: ids.warehouse, PartId: ids.part, TransactionType: "Opening", Quantity: "10" } });
    for (const key of ["order", "otherOrder"] as const) {
      const result = await orders.create({ origin: "Direct", sourceId: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, workLocation: "OnSite", workshopId: null, odometer: null, engineHours: null, problem: token, diagnosis: token, description: null });
      if (!result.success) throw new Error(result.error.type); ids[key] = result.id;
    }
    ids.task = (await client.workOrderTask.create({ data: { WorkOrderId: ids.order, TaskTitle: token, Status: "Open" } })).WorkOrderTaskId;
    ids.otherTask = (await client.workOrderTask.create({ data: { WorkOrderId: ids.otherOrder, TaskTitle: token, Status: "Open" } })).WorkOrderTaskId;
  }, 120000);
  afterAll(async () => {
    try {
      await client.workOrderPart.deleteMany({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder] } } });
      await client.workOrderTask.deleteMany({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder] } } });
      await client.workOrder.deleteMany({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder] } } });
      await client.stockTransaction.deleteMany({ where: { PartId: { in: [ids.part, ids.racePart] } } });
      await client.part.deleteMany({ where: { PartId: { in: [ids.part, ids.racePart] } } });
      if (ids.warehouse) await client.warehouse.delete({ where: { WarehouseId: ids.warehouse } });
      await client.unit.deleteMany({ where: { UnitId: { in: [ids.unit, ids.otherUnit] } } });
      if (ids.vehicle) await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      if (ids.type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: ids.type } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
      expect(await client.workOrderPart.count({ where: { WorkOrderId: { in: [ids.order, ids.otherOrder] } } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 120000);
  it("reads database-computed four-place totals and maximum precision without posting stock", async () => {
    const id = saved(await manage.save(ids.order, input()));
    const row = (await manage.get(ids.order))!.items.find(item => item.id === id)!;
    expect(row).toMatchObject({ quantity: "1.01", unitPrice: "2.03", totalPrice: "2.0503", partId: ids.part, taskId: ids.task });
    expect(Math.abs(Date.now() - new Date(row.createdAt).getTime())).toBeLessThan(300000);
    const maxId = saved(await manage.save(ids.order, { ...input(), taskId: null, quantity: "9999999999999999.99", unitPrice: "9999999999999999.99" }));
    expect((await manage.get(ids.order))!.items.find(item => item.id === maxId)!.totalPrice).toBe("99999999999999999800000000000000.0001");
    const movements = await client.stockTransaction.findMany({ where: { PartId: ids.part } });
    expect(movements).toHaveLength(1); expect(movements[0].Quantity.toFixed(2)).toBe("10.00");
    expect((await catalog.get(ids.part))!.isUsed).toBe(true);
    const part = (await catalog.get(ids.part))!;
    expect(await catalog.save({ ...part, unitId: ids.otherUnit })).toEqual({ success: false, error: { type: "UNIT_IN_USE" } });
    expect(await catalog.delete(ids.part)).toEqual({ success: false, error: { type: "PART_IN_USE" } });
    saved(await manage.save(ids.order, { ...input(), id: maxId, quantity: "0.01", unitPrice: "0.01" }));
    expect((await manage.get(ids.order))!.items.find(item => item.id === maxId)!.totalPrice).toBe("0.0001");
    expect((await manage.delete(ids.order, maxId)).success).toBe(true);
  }, 120000);
  it("checks absent catalog FKs, same-file tasks and retained inactive references explicitly", async () => {
    expect(await manage.save(ids.order, { ...input(), partId: 2147483647 })).toEqual({ success: false, error: { type: "PART_UNAVAILABLE" } });
    expect(await manage.save(ids.order, { ...input(), taskId: ids.otherTask })).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
    const existing = (await manage.get(ids.order))!.items[0];
    expect(await manage.save(ids.otherOrder, { ...input(), id: existing.id, taskId: null })).toEqual({ success: false, error: { type: "ITEM_NOT_FOUND" } });
    await client.part.update({ where: { PartId: ids.part }, data: { IsActive: false } });
    expect(await manage.save(ids.order, input())).toEqual({ success: false, error: { type: "PART_UNAVAILABLE" } });
    expect((await manage.save(ids.order, { ...input(), id: existing.id })).success).toBe(true);
    expect((await manage.get(ids.order))!.items[0].part!.isActive).toBe(false);
    await client.part.update({ where: { PartId: ids.part }, data: { IsActive: true } });
    const orphan = await client.workOrderPart.create({ data: { WorkOrderId: ids.order, PartId: 2147483647, Quantity: "1" }, select: { WorkOrderPartId: true } });
    expect((await manage.get(ids.order))!.items.find(item => item.id === orphan.WorkOrderPartId)!.part).toBeNull();
    expect((await manage.delete(ids.order, orphan.WorkOrderPartId)).success).toBe(true);
  }, 120000);
  it("rolls back failed writes, preserves consumption on cancellation and fills missing price once", async () => {
    await expect(repository.atomic(ids.otherOrder, async session => { await session.save({ ...input(), taskId: null }); throw new Error("Interrupted consumption"); })).rejects.toThrow("Interrupted consumption");
    expect((await manage.get(ids.otherOrder))!.items).toHaveLength(0);
    const id = saved(await manage.save(ids.otherOrder, { ...input(), taskId: null, unitPrice: null }));
    const before = (await manage.get(ids.otherOrder))!.items[0];
    const cancellation = new CancelWorkOrder(new PrismaWorkOrderRepository(client));
    expect(await cancellation.execute(ids.otherOrder, "Cancelled with consumption")).toEqual({ success: true });
    expect((await manage.get(ids.otherOrder))!.items[0]).toEqual(before);
    expect(await manage.delete(ids.otherOrder, id)).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
    expect(await manage.save(ids.otherOrder, input())).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
    const results = await Promise.all([manage.fillPrice(ids.otherOrder, id, "2.03"), manage.fillPrice(ids.otherOrder, id, "0.00")]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([{ success: false, error: { type: "PRICE_ALREADY_RECORDED" } }]);
    const after = (await manage.get(ids.otherOrder))!.items[0];
    expect(["2.0503", "0.0000"]).toContain(after.totalPrice);
    expect({ ...after, unitPrice: before.unitPrice, totalPrice: before.totalPrice }).toEqual(before);
  }, 120000);
  it("serializes catalog deletion with consumption despite the missing Part FK", async () => {
    const results = await Promise.all([manage.save(ids.order, { ...input(), taskId: null, partId: ids.racePart }), catalog.delete(ids.racePart)]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    if (results[0].success) { expect(results[1]).toEqual({ success: false, error: { type: "PART_IN_USE" } }); expect(await client.part.findUnique({ where: { PartId: ids.racePart } })).not.toBeNull(); }
    else { expect(results[0]).toEqual({ success: false, error: { type: "PART_UNAVAILABLE" } }); expect(await client.workOrderPart.count({ where: { PartId: ids.racePart } })).toBe(0); }
  }, 120000);
});
