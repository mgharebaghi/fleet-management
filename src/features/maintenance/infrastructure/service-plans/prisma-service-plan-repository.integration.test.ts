import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageServicePlans } from "../../application/service-plans/manage-service-plans";
import { PrismaServicePlanRepository } from "./prisma-service-plan-repository";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { ManageWorkOrders } from "../../application/work-orders/manage-work-orders";
import { PrismaWorkOrderRepository } from "../work-orders/prisma-work-order-repository";
it("persists exact plans, connects service files, protects baselines and rolls back failed changes", async () => {
  const config = loadTestDatabaseConfig("TEST_DATABASE"), client = new PrismaClient({ adapter: new PrismaMssql(config) }), token = `IT-PLAN-${randomUUID().slice(0, 8)}`;
  const repository = new PrismaServicePlanRepository(client), manage = new ManageServicePlans(repository);
  let brand = 0, model = 0, status = 0, vehicle = 0, type = 0;
  try {
    const [db] = await client.$queryRaw<Array<{ name: string }>>`SELECT DB_NAME() name`; expect(db.name).toBe(config.database);
    brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId; model = (await client.vehicleModel.create({ data: { BrandId: brand, ModelName: token } })).ModelId; status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    vehicle = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: model, VehicleStatusId: status, CurrentOdometer: "200.02" } })).VehicleId;
    const ref = await new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client)).saveType({ id: null, code: token, name: token, isActive: true, description: null }); if (!ref.success) throw new Error(ref.error.type); type = ref.value.id;
    const input = { id: null, vehicleId: vehicle, maintenanceTypeId: type, title: token, description: null, isActive: true, intervalKm: "100.01", intervalDays: "30", intervalHours: null, warningKm: "10.01", warningDays: "2", warningHours: null, lastOdometer: "100.01", lastDate: null, lastHours: null };
    const created = await manage.save(input); if (!created.success) throw new Error(created.error.type);
    const id = created.id, detail = await manage.get(id); expect(detail!.plan.intervalKm).toBe("100.01"); expect(detail!.due.status).toBe("Due"); expect(detail!.due.criteria.find(row => row.key === "days")!.status).toBe("Unknown");
    const listed = await manage.list({ search: token, status: "Due", vehicleId: vehicle, page: 1 }); expect(listed.totalCount).toBe(1);
    const orderInput = { origin: "Plan", sourceId: id, vehicleId: vehicle, maintenanceTypeId: type, workLocation: "OnSite", workshopId: null, odometer: null, engineHours: null, problem: token, diagnosis: null, description: null };
    const orders = new ManageWorkOrders(new PrismaWorkOrderRepository(client)); expect((await orders.create(orderInput)).success).toBe(true);
    expect(await manage.remove(id)).toEqual({ success: false, error: { type: "PLAN_IN_USE" } });
    const unused = await manage.save({ ...input, title: token + "-unused" });
    if (!unused.success) throw new Error(unused.error.type);
    expect(await manage.remove(unused.id)).toEqual({ success: true, id: unused.id });
    expect(await manage.get(unused.id)).toBeNull();
    expect(await manage.save({ ...input, id, lastOdometer: "100.02" })).toEqual({ success: false, error: { type: "BASELINE_LOCKED" } });
    expect(await manage.save({ ...input, id, vehicleId: 2147483647 })).toEqual({ success: false, error: { type: "SOURCE_FIXED" } });
    expect((await manage.save({ ...input, id, isActive: false })).success).toBe(true); expect((await manage.get(id))!.orders).toHaveLength(1);
    expect((await manage.get(id))!.due.status).toBe("Inactive"); expect(await orders.create(orderInput)).toEqual({ success: false, error: { type: "SOURCE_UNAVAILABLE" } });
    await expect(repository.atomic(id, async session => { await session.save({ ...input, id, title: "Rollback" }); throw new Error("Interrupted plan write"); })).rejects.toThrow("Interrupted plan write");
    expect((await manage.get(id))!.plan.title).toBe(token); expect((await manage.get(id))!.plan.isActive).toBe(false);
  } finally {
    try {
      if (vehicle) { await client.workOrder.deleteMany({ where: { VehicleId: vehicle } }); await client.maintenancePlan.deleteMany({ where: { VehicleId: vehicle } }); await client.vehicle.delete({ where: { VehicleId: vehicle } }); }
      if (type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: type } }); if (model) await client.vehicleModel.delete({ where: { ModelId: model } }); if (brand) await client.vehicleBrand.delete({ where: { BrandId: brand } }); if (status) await client.vehicleStatus.delete({ where: { VehicleStatusId: status } });
    } finally { await client.$disconnect(); }
  }
}, 180000);
