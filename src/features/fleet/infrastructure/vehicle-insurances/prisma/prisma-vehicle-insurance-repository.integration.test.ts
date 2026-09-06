import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import { PrismaVehicleInsuranceRepository } from "./prisma-vehicle-insurance-repository";
import { CreateVehicleInsurance } from "../../../application/vehicle-insurances/create-vehicle-insurance/create-vehicle-insurance";
import { InsuranceVehicleNotFoundError } from "../../../application/vehicle-insurances/ports/vehicle-insurance-writer";
import type { NewVehicleInsurance, VehicleInsuranceSearchCriteria } from "../../../application/vehicle-insurances/vehicle-insurance";

config({ path: ".env", quiet: true });
const development = { server: process.env.DATABASE_SERVER?.trim().toLowerCase(), port: process.env.DATABASE_PORT?.trim() || "1433", name: process.env.DATABASE_NAME?.trim().toLowerCase() };
config({ path: ".env.test.local", quiet: true });
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (connection.database.toLowerCase() !== "fleetmanagementdb_integrationtest" || (development.server === connection.server.toLowerCase() && development.port === String(connection.port) && development.name === connection.database.toLowerCase())) throw new Error("Insurance integration tests require an isolated FleetManagementDB_Integrationtest database.");
const client = new PrismaClient({ adapter: new PrismaMssql(connection) });
const repository = new PrismaVehicleInsuranceRepository(client);
const insuranceIds: bigint[] = [], vehicleIds: number[] = [], modelIds: number[] = [], brandIds: number[] = [], statusIds: number[] = [];
let verified = false;
const criteria = (search: string | null): VehicleInsuranceSearchCriteria => ({ search, isActive: null, pageNumber: 1, pageSize: 20 });

async function fixture(): Promise<NewVehicleInsurance & { vehicleBrandName: string; vehicleModelName: string }> {
  if (!verified) throw new Error("Test database has not been verified.");
  const token = randomUUID();
  // Distinct from every other fixture field (VehicleCode/InsuranceType/StatusName
  // all otherwise share the bare `IT-${token}` shape) so a search match can only
  // be attributed to the Brand or Model relation, never to a coincidentally
  // identical value on an unrelated field.
  const vehicleBrandName = `IT-Brand-${token}`, vehicleModelName = `IT-Model-${token}`;
  const brand = await client.vehicleBrand.create({ data: { BrandName: vehicleBrandName } }); brandIds.push(brand.BrandId);
  const model = await client.vehicleModel.create({ data: { ModelName: vehicleModelName, BrandId: brand.BrandId } }); modelIds.push(model.ModelId);
  const status = await client.vehicleStatus.create({ data: { StatusName: `IT-${token}` } }); statusIds.push(status.VehicleStatusId);
  const vehicle = await client.vehicle.create({ data: { VehicleCode: `IT-${token}`, PlateNoLeftSide: "12", PlateNoCenterChar: "X", PlateNoRightSide: "345", PlateNoIranNo: "67", ModelId: model.ModelId, VehicleStatusId: status.VehicleStatusId, IsActive: false } }); vehicleIds.push(vehicle.VehicleId);
  return { vehicleId: vehicle.VehicleId, insuranceType: `IT-${token}`, insuranceCompany: `Company-${token}`, policyNo: `Policy-${token}`, startDate: new Date("2024-03-20"), expireDate: new Date("2025-03-20"), premiumAmount: null, coverageAmount: null, vehicleBrandName, vehicleModelName };
}
async function create(input: NewVehicleInsurance) {
  const result = await repository.create(input); insuranceIds.push(BigInt(result.vehicleInsuranceId)); return result.vehicleInsuranceId;
}

describe.sequential("PrismaVehicleInsuranceRepository integration", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; insurance: number | null; vehicle: number | null; model: number | null; brand: number | null; status: number | null }>>`SELECT DB_NAME() AS name, OBJECT_ID(N'fleet.VehicleInsurance') AS insurance, OBJECT_ID(N'fleet.Vehicle') AS vehicle, OBJECT_ID(N'fleet.VehicleModel') AS model, OBJECT_ID(N'fleet.VehicleBrand') AS brand, OBJECT_ID(N'fleet.VehicleStatus') AS status`;
    if (!identity || identity.name.toLowerCase() !== connection.database.toLowerCase() || [identity.insurance, identity.vehicle, identity.model, identity.brand, identity.status].some(id => id === null)) throw new Error("Insurance integration database identity/baseline mismatch.");
    verified = true;
  });
  afterEach(async () => {
    if (!verified) return;
    await client.vehicleInsurance.deleteMany({ where: { VehicleInsuranceId: { in: insuranceIds } } });
    expect(await client.vehicleInsurance.count({ where: { VehicleInsuranceId: { in: insuranceIds } } })).toBe(0);
    insuranceIds.length = 0;
    await client.vehicle.deleteMany({ where: { VehicleId: { in: vehicleIds } } }); vehicleIds.length = 0;
    await client.vehicleModel.deleteMany({ where: { ModelId: { in: modelIds } } }); modelIds.length = 0;
    await client.vehicleBrand.deleteMany({ where: { BrandId: { in: brandIds } } }); brandIds.length = 0;
    await client.vehicleStatus.deleteMany({ where: { VehicleStatusId: { in: statusIds } } }); statusIds.length = 0;
  });
  afterAll(async () => { await client.$disconnect(); });

  it("persists identity/defaults, nullable fields and an expired period for an inactive vehicle", async () => {
    const input = await fixture(); input.insuranceCompany = null; input.policyNo = null;
    const id = await create(input);
    expect(BigInt(id)).toBeGreaterThan(BigInt(0));
    const stored = await client.vehicleInsurance.findUniqueOrThrow({ where: { VehicleInsuranceId: BigInt(id) } });
    expect(stored).toMatchObject({ IsActive: true, InsuranceCompany: null, PolicyNo: null, PremiumAmount: null, CoverageAmount: null, StartDate: input.startDate, ExpireDate: input.expireDate });
    const result = await repository.search(criteria(input.insuranceType));
    expect(result.insurances).toHaveLength(1);
    expect(result.insurances[0]).toMatchObject({ vehicleInsuranceId: id, premiumAmount: null, vehicle: { vehicleId: input.vehicleId, isActive: false, plateNoLeftSide: "12", plateNoCenterChar: "X", plateNoRightSide: "345", plateNoIranNo: "67", brandName: input.vehicleBrandName, modelName: input.vehicleModelName } });
    expect(await repository.vehicleExists(input.vehicleId)).toBe(true);
    expect(await repository.vehicleExists(-1)).toBe(false);
    expect(await repository.listVehicles()).toEqual(expect.arrayContaining([expect.objectContaining({ vehicleId: input.vehicleId, isActive: false, brandName: input.vehicleBrandName, modelName: input.vehicleModelName })]));
  });
  it("preserves exact decimal digits on both create and production list reads", async () => {
    const input = await fixture(); input.premiumAmount = "9999999999999999.99"; input.coverageAmount = "1234567890123456.78";
    const id = await create(input);
    const [exact] = await client.$queryRaw<Array<{ premium: string; coverage: string }>>`SELECT CONVERT(varchar(40), PremiumAmount) AS premium, CONVERT(varchar(40), CoverageAmount) AS coverage FROM fleet.VehicleInsurance WHERE VehicleInsuranceId = ${BigInt(id)}`;
    expect(exact).toEqual({ premium: input.premiumAmount, coverage: input.coverageAmount });
    expect((await repository.search(criteria(input.insuranceType))).insurances[0]).toMatchObject({ premiumAmount: input.premiumAmount, coverageAmount: input.coverageAmount });
    await create({ ...input, premiumAmount: "0", coverageAmount: "0.01" });
    expect((await repository.search(criteria(input.insuranceType))).insurances[0]).toMatchObject({ premiumAmount: "0.00", coverageAmount: "0.01" });
  });
  it("maps the real missing-vehicle FK failure and prevents deleting a referenced vehicle", async () => {
    const input = await fixture();
    await expect(repository.create({ ...input, vehicleId: -1 })).rejects.toBeInstanceOf(InsuranceVehicleNotFoundError);
    await create(input);
    await expect(client.vehicle.delete({ where: { VehicleId: input.vehicleId } })).rejects.toMatchObject({ code: "P2003" });
  });
  it("allows duplicate policies, overlaps and future dates through the create use case", async () => {
    const input = await fixture(); input.startDate = new Date("2099-01-01"); input.expireDate = new Date("2099-01-01");
    const useCase = new CreateVehicleInsurance(repository, repository);
    for (let index = 0; index < 2; index++) {
      const result = await useCase.execute(input);
      if (result.success) insuranceIds.push(BigInt(result.vehicleInsuranceId));
      expect(result.success).toBe(true);
    }
    expect((await repository.search(criteria(input.policyNo))).totalCount).toBe(2);
  });
  it("orders by identity descending and keeps page counts consistent with filters", async () => {
    const input = await fixture(); const first = await create(input); const second = await create(input);
    const query = { ...criteria(input.insuranceType), pageSize: 1 };
    expect((await repository.search(query)).insurances.map(row => row.vehicleInsuranceId)).toEqual([second]);
    expect((await repository.search({ ...query, pageNumber: 2 })).insurances.map(row => row.vehicleInsuranceId)).toEqual([first]);
    expect(await repository.search({ ...query, pageNumber: 3 })).toEqual({ insurances: [], totalCount: 2 });
    await client.vehicleInsurance.update({ where: { VehicleInsuranceId: BigInt(second) }, data: { IsActive: false } });
    expect((await repository.search({ ...query, isActive: true })).insurances.map(row => row.vehicleInsuranceId)).toEqual([first]);
    const inactive = await repository.search({ ...query, isActive: false });
    expect(inactive.totalCount).toBe(1); expect(inactive.insurances[0].vehicleInsuranceId).toBe(second);
  });
  it("searches insurance fields and related vehicle code/plate/brand/model and parameterizes search values", async () => {
    const input = await fixture(); const id = await create(input);
    const vehicle = await client.vehicle.findUniqueOrThrow({ where: { VehicleId: input.vehicleId } });
    for (const search of [input.insuranceType, input.insuranceCompany, input.policyNo, vehicle.VehicleCode, input.vehicleBrandName, input.vehicleModelName]) {
      expect((await repository.search(criteria(search))).insurances.map(row => row.vehicleInsuranceId)).toEqual([id]);
    }
    for (const plate of ["12", "X", "345", "67"]) {
      // Include a unique token in the plate part to avoid relying on unrelated test data.
      const field = plate === "12" ? "PlateNoLeftSide" : plate === "X" ? "PlateNoCenterChar" : plate === "345" ? "PlateNoRightSide" : "PlateNoIranNo";
      const code = plate === "X" ? "QXZ" : plate;
      await client.vehicle.update({ where: { VehicleId: input.vehicleId }, data: { [field]: code } });
      const result = await repository.search({ ...criteria(code), pageSize: 100 });
      expect(result.insurances.map(row => row.vehicleInsuranceId)).toContain(id);
    }
    expect(await repository.search(criteria(`missing-${randomUUID()}' OR 1=1 --`))).toEqual({ insurances: [], totalCount: 0 });
  });
});
