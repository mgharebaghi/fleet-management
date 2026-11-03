import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "./prisma-maintenance-reference-repository";
import { MaintenanceTypeInUseError } from "../../application/reference-data/maintenance-reference-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-M-${randomUUID().slice(0, 12)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config), transactionOptions: { maxWait: 15000 } });
const repository = new PrismaMaintenanceReferenceRepository(client), manage = new ManageMaintenanceReferences(repository);
const search = { search: token, active: "all", page: 1 } as const;
const workshopInput = { id: null, name: token, workshopType: "General custom classification", isInternal: false, address: "Address", phone: "۰۲۱۱۲۳", contactPerson: "Contact", description: "x".repeat(1000), isActive: true };
let workshopId: number;
let vehicleId: number, modelId: number, brandId: number, statusId: number;
describe.sequential("maintenance reference SQL Server persistence", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string }>>`SELECT DB_NAME() name`;
    if (identity.name !== config.database) throw new Error("Integration database identity differs");
  });
  afterAll(async () => {
    try {
      if (vehicleId) {
        await client.workOrder.deleteMany({ where: { VehicleId: vehicleId } });
        await client.maintenanceRequest.deleteMany({ where: { VehicleId: vehicleId } });
        await client.maintenancePlan.deleteMany({ where: { VehicleId: vehicleId } });
        await client.vehicle.delete({ where: { VehicleId: vehicleId } });
      }
      if (modelId) await client.vehicleModel.delete({ where: { ModelId: modelId } });
      if (brandId) await client.vehicleBrand.delete({ where: { BrandId: brandId } });
      if (statusId) await client.vehicleStatus.delete({ where: { VehicleStatusId: statusId } });
      await client.technician.deleteMany({ where: { LastName: token } });
      await client.workshop.deleteMany({ where: { WorkshopName: { startsWith: token } } });
      await client.maintenanceType.deleteMany({ where: { TypeCode: { startsWith: token } } });
      expect(await client.technician.count({ where: { LastName: token } })).toBe(0);
    } finally { await client.$disconnect(); }
  }, 60000);
  it("allocates distinct tinyint keys under concurrency and protects unique codes", async () => {
    const input = { id: null, code: `${token}-a`, name: token, description: null, isActive: true };
    const results = await Promise.all([manage.saveType(input), manage.saveType({ ...input, code: `${token}-b` })]);
    expect(results.every(result => result.success)).toBe(true);
    const ids = results.map(result => result.success ? result.value.id : 0);
    expect(new Set(ids).size).toBe(2); expect(ids.every(id => id >= 1 && id <= 255)).toBe(true);
    const duplicates = await Promise.all([manage.saveType({ ...input, code: `${token}-c` }), manage.saveType({ ...input, code: `${token}-c` })]);
    expect(duplicates.filter(result => result.success)).toHaveLength(1);
    expect(duplicates.filter(result => !result.success)).toEqual([{ success: false, error: { type: "DUPLICATE_CODE" } }]);
  }, 90000);
  it("deletes unused types and protects every reference including inactive plans and cancelled records", async () => {
    const input = { id: null, code: `${token}-delete`, name: token, description: null, isActive: true };
    const unused = await manage.saveType(input); if (!unused.success) throw new Error("Type fixture failed");
    expect((await manage.types({ ...search, search: input.code })).rows[0].isUsed).toBe(false);
    expect(await manage.deleteType(unused.value.id)).toEqual({ success: true, value: unused.value.id });
    expect(await manage.type(unused.value.id)).toBeNull();
    brandId = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    modelId = (await client.vehicleModel.create({ data: { BrandId: brandId, ModelName: token } })).ModelId;
    statusId = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    vehicleId = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: modelId, VehicleStatusId: statusId } })).VehicleId;
    for (const kind of ["plan", "request", "order"] as const) {
      const type = await manage.saveType({ ...input, code: `${token}-${kind}` }); if (!type.success) throw new Error("Type fixture failed");
      const reference = { VehicleId: vehicleId, MaintenanceTypeId: type.value.id };
      if (kind === "plan") await client.maintenancePlan.create({ data: { ...reference, PlanTitle: token, IntervalDays: 30, IsActive: false } });
      if (kind === "request") await client.maintenanceRequest.create({ data: { ...reference, Status: "Cancelled" } });
      if (kind === "order") await client.workOrder.create({ data: { ...reference, WorkOrderNo: token, WorkLocationType: "OnSite", Status: "Cancelled" } });
      expect((await manage.types({ ...search, search: `${token}-${kind}` })).rows[0].isUsed).toBe(true);
      expect(await manage.deleteType(type.value.id)).toEqual({ success: false, error: { type: "TYPE_IN_USE" } });
      await expect(repository.atomic(session => session.deleteType(type.value.id))).rejects.toBeInstanceOf(MaintenanceTypeInUseError);
      expect(await manage.type(type.value.id)).not.toBeNull();
    }
  }, 180000);
  it("stores free classifications, SQL-managed times and nullable independent technicians", async () => {
    const workshop = await manage.saveWorkshop(workshopInput);
    if (!workshop.success) throw new Error("Fixture failed");
    workshopId = workshop.value.id;
    const duplicateName = await manage.saveWorkshop(workshopInput); expect(duplicateName.success).toBe(true);
    const saved = await client.workshop.findUniqueOrThrow({ where: { WorkshopId: workshopId } });
    expect(saved.CreatedAt).toBeInstanceOf(Date); expect(saved.Description).toHaveLength(1000); expect(saved.Phone).toBe("021123"); expect(saved.IsInternal).toBe(false);
    const independent = await manage.saveTechnician({ id: null, workshopId: null, firstName: "Independent", lastName: token, mobile: null, specialty: null, description: null, isActive: true });
    expect(independent.success && independent.value.workshopId).toBeNull();
    expect((await manage.workshops(search)).totalCount).toBe(2);
  }, 90000);
  it("preserves affiliations when workshops are deactivated while blocking new assignments", async () => {
    const input = { id: null, workshopId: workshopId, firstName: "First", lastName: token, mobile: "۰۹۱۲۳", specialty: "Specialty", description: "x".repeat(1000), isActive: true };
    const technician = await manage.saveTechnician(input); if (!technician.success) throw new Error("Fixture failed");
    expect(technician.value.mobile).toBe("09123");
    expect((await manage.saveWorkshop({ ...workshopInput, id: workshopId, isActive: false })).success).toBe(true);
    expect(await manage.saveTechnician(input)).toEqual({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
    expect((await manage.saveTechnician({ ...input, id: technician.value.id, isActive: false })).success).toBe(true);
    const record = await manage.workshop(workshopId);
    expect(record?.technicians).toHaveLength(1); expect(record?.workOrderCount).toBe(0);
    expect((await manage.technicians({ ...search, search: `${token}` })).rows).toHaveLength(2);
    expect((await manage.technician(technician.value.id))?.workshopActive).toBe(false);
  }, 90000);
  it("rolls back interrupted writes and pages the complete filtered count", async () => {
    await expect(repository.atomic(async session => { await session.saveWorkshop({ ...workshopInput, name: `${token}-rollback` }); throw new Error("Synthetic interruption"); })).rejects.toThrow("Synthetic interruption");
    expect(await client.workshop.count({ where: { WorkshopName: `${token}-rollback` } })).toBe(0);
    await client.workshop.createMany({ data: Array.from({ length: 21 }, (_, index) => ({ WorkshopName: `${token}-page-${index}`, WorkshopType: "Free", IsActive: false })) });
    const page = await manage.workshops({ search: `${token}-page`, active: "inactive", page: 2 });
    expect(page.totalCount).toBe(21); expect(page.rows).toHaveLength(1);
    expect((await manage.workshops({ search: `${token}-page`, active: "active", page: 1 })).totalCount).toBe(0);
  }, 90000);
});
