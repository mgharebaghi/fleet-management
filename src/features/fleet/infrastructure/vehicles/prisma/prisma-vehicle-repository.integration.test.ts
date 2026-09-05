import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import { PrismaVehicleRepository } from "./prisma-vehicle-repository";
import { CreateVehicle } from "../../../application/vehicles/create-vehicle/create-vehicle";
import type { NewVehicle } from "../../../application/vehicles/vehicle";

config({ path: ".env", quiet: true });
const development = { server: process.env.DATABASE_SERVER, port: process.env.DATABASE_PORT || "1433", name: process.env.DATABASE_NAME };
config({ path: ".env.test.local", quiet: true });
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (connection.database.toLowerCase() !== "fleetmanagementdb_integrationtest" || (development.server?.toLowerCase() === connection.server.toLowerCase() && development.port === String(connection.port) && development.name?.toLowerCase() === connection.database.toLowerCase())) throw new Error("Vehicle integration tests require an isolated FleetManagementDB_Integrationtest database.");
const client = new PrismaClient({ adapter: new PrismaMssql(connection) });
const repository = new PrismaVehicleRepository(client);
const vehicles: number[] = [], models: number[] = [], brands: number[] = [], statuses: number[] = [], types: number[] = [], fuels: number[] = [];
let verified = false;
async function fixture(): Promise<NewVehicle> {
  const token = randomUUID();
  const brand = await client.vehicleBrand.create({ data: { BrandName: `IT-${token}` } }); brands.push(brand.BrandId);
  const type = await client.vehicleType.create({ data: { TypeName: `IT-${token}` } }); types.push(type.VehicleTypeId);
  const fuel = await client.fuelType.create({ data: { FuelTypeName: `IT-${token}` } }); fuels.push(fuel.FuelTypeId);
  const model = await client.vehicleModel.create({ data: { ModelName: `IT-${token}`, BrandId: brand.BrandId, VehicleTypeId: type.VehicleTypeId, FuelTypeId: fuel.FuelTypeId, IsActive: false } }); models.push(model.ModelId);
  const status = await client.vehicleStatus.create({ data: { StatusName: `IT-${token}` } }); statuses.push(status.VehicleStatusId);
  return { vehicleCode: `IT-${token}`, plateNoLeftSide: "12", plateNoCenterChar: "ب", plateNoRightSide: "345", plateNoIranNo: "67", internationalPlateNo: null, vin: null, engineNo: null, chassisNo: null, modelId: model.ModelId, vehicleStatusId: status.VehicleStatusId, modelYear: null, purchaseDate: null, purchasePrice: null, currentOdometer: null, currentEngineHour: null };
}
async function create(input: NewVehicle) { const result = await repository.create(input); vehicles.push(result.vehicleId); return result.vehicleId; }
describe.sequential("PrismaVehicleRepository integration", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; vehicle: number | null }>>`SELECT DB_NAME() AS name, OBJECT_ID(N'fleet.Vehicle') AS vehicle`;
    if (!identity || identity.name.toLowerCase() !== connection.database.toLowerCase() || identity.vehicle === null) throw new Error("Vehicle test database identity/baseline mismatch.");
    verified = true;
  });
  afterEach(async () => {
    if (!verified) return;
    await client.vehicle.deleteMany({ where: { VehicleId: { in: vehicles } } }); vehicles.length = 0;
    await client.vehicleModel.deleteMany({ where: { ModelId: { in: models } } }); models.length = 0;
    await client.vehicleBrand.deleteMany({ where: { BrandId: { in: brands } } }); brands.length = 0;
    await client.vehicleType.deleteMany({ where: { VehicleTypeId: { in: types } } }); types.length = 0;
    await client.fuelType.deleteMany({ where: { FuelTypeId: { in: fuels } } }); fuels.length = 0;
    await client.vehicleStatus.deleteMany({ where: { VehicleStatusId: { in: statuses } } }); statuses.length = 0;
  });
  afterAll(async () => { await client.$disconnect(); });
  it("persists generated defaults, nullable fields and exact decimals/date with an inactive model", async () => {
    const input = await fixture();
    input.purchasePrice = "9999999999999999.99"; input.currentOdometer = "1234567890123456.78"; input.currentEngineHour = "0"; input.purchaseDate = new Date("2024-03-20T00:00:00Z");
    const id = await create(input);
    const row = await client.vehicle.findUniqueOrThrow({ where: { VehicleId: id } });
    expect(id).toBeGreaterThan(0); expect(row.IsActive).toBe(true); expect(row.CreatedAt).toBeInstanceOf(Date);
    expect(row.VIN).toBeNull(); expect(row.ModelYear).toBeNull(); expect(row.EngineNo).toBeNull(); expect(row.ChassisNo).toBeNull(); expect(row.InternationalPlateNo).toBeNull();
    // The SQL Server driver's decimal result decoder uses JS numbers. Read text
    // from SQL to verify the stored value without that lossy decoding step.
    const [exact] = await client.$queryRaw<Array<{ price: string; odometer: string; hours: string }>>`SELECT CONVERT(varchar(40), PurchasePrice) AS price, CONVERT(varchar(40), CurrentOdometer) AS odometer, CONVERT(varchar(40), CurrentEngineHour) AS hours FROM fleet.Vehicle WHERE VehicleId = ${id}`;
    expect(exact.price).toBe(input.purchasePrice); expect(exact.odometer).toBe(input.currentOdometer); expect(exact.hours).toBe("0.00"); expect(row.PurchaseDate).toEqual(input.purchaseDate);
    expect(await repository.modelExists(input.modelId)).toBe(true); expect(await repository.statusExists(input.vehicleStatusId)).toBe(true);
    expect(await repository.modelExists(-1)).toBe(false); expect(await repository.statusExists(-1)).toBe(false);
  });
  it("allows an existing inactive model through the create use case", async () => {
    const input = await fixture(); input.plateNoCenterChar = randomUUID().slice(0, 3);
    const result = await new CreateVehicle(repository, repository, repository).execute(input);
    if (result.success) vehicles.push(result.vehicleId);
    expect(result.success).toBe(true);
  });
  it("checks each identifier and the complete plate across inactive records", async () => {
    const input = await fixture(); input.internationalPlateNo = randomUUID().slice(0, 10); input.vin = randomUUID(); input.engineNo = randomUUID(); input.chassisNo = randomUUID();
    const id = await create(input); await client.vehicle.update({ where: { VehicleId: id }, data: { IsActive: false } });
    for (const field of ["vehicleCode", "internationalPlateNo", "vin", "engineNo", "chassisNo"] as const) {
      expect(await repository.identifierExists(field, input[field]!)).toBe(true); expect(await repository.identifierExists(field, randomUUID())).toBe(false);
    }
    expect(await repository.internalPlateExists(input)).toBe(true); expect(await repository.internalPlateExists({ ...input, plateNoCenterChar: "XYZ" })).toBe(false);
  });
  it("enforces real model and status foreign keys", async () => {
    const input = await fixture();
    await expect(create({ ...input, modelId: -1 })).rejects.toMatchObject({ code: "P2003" });
    await expect(create({ ...input, vehicleStatusId: -1 })).rejects.toMatchObject({ code: "P2003" });
  });
  it("maps relations, sorts descending, pages/counts, filters and searches identifier columns", async () => {
    const input = await fixture(); input.vin = `VIN-${randomUUID()}`; input.engineNo = `EN-${randomUUID()}`; input.chassisNo = `CH-${randomUUID()}`; input.internationalPlateNo = randomUUID().slice(0, 10);
    const first = await create(input); const second = await create({ ...input, vehicleCode: `${input.vehicleCode}-2` });
    const criteria = { search: input.vehicleCode, pageNumber: 1, pageSize: 1, isActive: null, vehicleStatusId: input.vehicleStatusId };
    const page = await repository.search(criteria);
    expect(page.totalCount).toBe(2); expect(page.vehicles.map(v => v.vehicleId)).toEqual([second]);
    expect(page.vehicles[0]).toMatchObject({ model: { id: input.modelId }, status: { id: input.vehicleStatusId }, brand: { id: brands[0] }, vehicleType: { id: types[0] }, fuelType: { id: fuels[0] } });
    expect((await repository.search({ ...criteria, pageNumber: 2 })).vehicles.map(v => v.vehicleId)).toEqual([first]);
    for (const search of [input.vin, input.engineNo, input.chassisNo, input.internationalPlateNo, input.plateNoLeftSide, input.plateNoCenterChar, input.plateNoRightSide, input.plateNoIranNo]) expect((await repository.search({ ...criteria, search, pageSize: 20 })).totalCount).toBe(2);
    await client.vehicle.update({ where: { VehicleId: second }, data: { IsActive: false } });
    expect((await repository.search({ ...criteria, isActive: true })).vehicles.map(v => v.vehicleId)).toEqual([first]);
    expect((await repository.search({ ...criteria, isActive: false })).vehicles.map(v => v.vehicleId)).toEqual([second]);
    expect((await repository.search({ ...criteria, vehicleStatusId: -1 })).totalCount).toBe(0);
  });
  it("searches the related brand, model, type, fuel and status names shown in the list", async () => {
    const input = await fixture(); input.modelYear = 1402;
    const id = await create(input);
    const model = await client.vehicleModel.findUniqueOrThrow({ where: { ModelId: input.modelId }, select: { ModelName: true, VehicleBrand: { select: { BrandName: true } }, VehicleType: { select: { TypeName: true } }, FuelType: { select: { FuelTypeName: true } } } });
    const status = await client.vehicleStatus.findUniqueOrThrow({ where: { VehicleStatusId: input.vehicleStatusId }, select: { StatusName: true } });
    const criteria = { search: null as string | null, pageNumber: 1, pageSize: 20, isActive: null, vehicleStatusId: null };
    for (const search of [model.ModelName, model.VehicleBrand.BrandName, model.VehicleType!.TypeName, model.FuelType!.FuelTypeName, status.StatusName]) {
      const found = await repository.search({ ...criteria, search });
      expect(found.vehicles.map(v => v.vehicleId)).toContain(id);
    }
    // ModelYear is a smallint, so it matches exactly rather than by substring.
    expect((await repository.search({ ...criteria, search: "1402", vehicleStatusId: input.vehicleStatusId })).vehicles.map(v => v.vehicleId)).toEqual([id]);
    expect((await repository.search({ ...criteria, search: "140", vehicleStatusId: input.vehicleStatusId })).totalCount).toBe(0);
  });
});
