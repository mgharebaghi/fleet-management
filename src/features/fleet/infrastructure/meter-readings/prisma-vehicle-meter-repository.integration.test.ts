import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { RecordVehicleMeter } from "../../application/meter-readings/record-vehicle-meter";
import { VehicleMeterHistoryError } from "../../application/meter-readings/direct-meter-edit";
import { PrismaVehicleMeterRepository } from "./prisma-vehicle-meter-repository";
import { PrismaVehicleRepository } from "../vehicles/prisma/prisma-vehicle-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-METER-${randomUUID().slice(0, 8)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const repository = new PrismaVehicleMeterRepository(client), record = new RecordVehicleMeter(repository), vehicles = new PrismaVehicleRepository(client);
const ids = { brand: 0, model: 0, status: 0, vehicle: 0 };
const input = (odometer: string, offset = 0) => ({ vehicleId: ids.vehicle, recordedAt: new Date(Date.now() - 30000 + offset), odometer, engineHours: null, description: token });
describe.sequential("vehicle meter SQL Server contract", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; zone: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() zone`;
    expect(identity).toEqual({ name: config.database, zone: "Iran Standard Time" });
    const columns = await client.$queryRaw<Array<{ name: string; type: string; precision: number; scale: number; identity: boolean }>>`SELECT name,TYPE_NAME(user_type_id) type,precision,scale,is_identity [identity] FROM sys.columns WHERE object_id=OBJECT_ID(N'fleet.VehicleMeterReading')`;
    expect(columns.find(column => column.name === "MeterReadingId")).toMatchObject({ type: "int", identity: true });
    for (const name of ["Odometer", "EngineHour"]) expect(columns.find(column => column.name === name)).toMatchObject({ type: "decimal", precision: 18, scale: 2 });
    expect(columns.find(column => column.name === "ReadingDate")).toMatchObject({ type: "datetime2", scale: 7 });
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { BrandId: ids.brand, ModelName: token } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: ids.model, VehicleStatusId: ids.status, CurrentOdometer: "100.00", CurrentEngineHour: "10.00" } })).VehicleId;
  }, 120000);
  afterEach(async () => {
    await client.vehicleMeterReading.deleteMany({ where: { VehicleId: ids.vehicle } });
    if (ids.vehicle) await client.vehicle.update({ where: { VehicleId: ids.vehicle }, data: { CurrentOdometer: "100.00", CurrentEngineHour: "10.00" } });
  }, 90000);
  afterAll(async () => {
    try {
      if (ids.vehicle) await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
    } finally { await client.$disconnect(); }
  }, 90000);
  it("preserves exact decimals and Tehran timestamps, syncs current meters and protects direct edits", async () => {
    const value = { ...input("9999999999999999.99"), engineHours: "25.10" };
    expect((await record.execute(value)).success).toBe(true);
    const listed = await repository.list(ids.vehicle, { search: token, page: 1 }); expect(listed.totalCount).toBe(1);
    expect(listed.rows[0]).toMatchObject({ odometer: "9999999999999999.99", engineHours: "25.10", description: token });
    expect(Date.parse(listed.rows[0].recordedAt)).toBe(value.recordedAt.getTime());
    const saved = (await vehicles.findById(ids.vehicle))!; expect(saved).toMatchObject({ hasMeterHistory: true, currentOdometer: "9999999999999999.99", currentEngineHour: "25.10" });
    await expect(vehicles.update(ids.vehicle, { ...saved, currentOdometer: "1" })).rejects.toThrow(VehicleMeterHistoryError);
    await vehicles.update(ids.vehicle, { ...saved, currentEngineHour: "25.1", engineNo: token });
    expect((await vehicles.findById(ids.vehicle))!.engineNo).toBe(token);
    expect((await record.execute(input("9999999999999999.98", 1000))).success).toBe(false);
    expect(await client.vehicleMeterReading.count({ where: { VehicleId: ids.vehicle } })).toBe(1);
  }, 180000);
  it("rolls history and current readings back together", async () => {
    await expect(repository.atomic(ids.vehicle, async session => {
      await session.append({ ...input("150"), recordedAt: new Date(Date.now() - 5000) });
      await session.updateCurrent({ odometer: "150", engineHours: "10" }); throw new Error("Interrupted meter write");
    })).rejects.toThrow("Interrupted meter write");
    expect(await client.vehicleMeterReading.count({ where: { VehicleId: ids.vehicle } })).toBe(0);
    expect((await vehicles.findById(ids.vehicle))!.currentOdometer).toBe("100.00");
  }, 90000);
  it("accepts a historical reading only between its neighbors and never lowers the current value", async () => {
    const at = (hours: number) => new Date(Date.now() - hours * 3600000);
    expect((await record.execute({ ...input("120"), recordedAt: at(72) })).success).toBe(true);
    expect((await record.execute({ ...input("200"), recordedAt: at(24) })).success).toBe(true);
    expect((await record.execute({ ...input("150"), recordedAt: at(48) })).success).toBe(true);
    expect((await record.execute({ ...input("250"), recordedAt: at(48) })).success).toBe(false);
    expect((await vehicles.findById(ids.vehicle))!.currentOdometer).toBe("200.00");
    const filtered = await repository.list(ids.vehicle, { search: "150", page: 1 }); expect(filtered.totalCount).toBe(1); expect(filtered.rows[0].odometer).toBe("150.00");
  }, 180000);
  it("serializes competing meter writes and a first reading versus a stale direct edit", async () => {
    const first = input("150"), second = { ...first, odometer: "200" };
    const results = await Promise.all([record.execute(first), record.execute(second)]);
    expect(results.some(result => result.success)).toBe(true); expect((await vehicles.findById(ids.vehicle))!.currentOdometer).toBe("200.00");
    await client.vehicleMeterReading.deleteMany({ where: { VehicleId: ids.vehicle } }); await client.vehicle.update({ where: { VehicleId: ids.vehicle }, data: { CurrentOdometer: "100" } });
    const stale = (await vehicles.findById(ids.vehicle))!;
    const race = await Promise.allSettled([record.execute(input("100")), vehicles.update(ids.vehicle, { ...stale, currentOdometer: "150" })]);
    const rows = await repository.list(ids.vehicle, { search: "", page: 1 }); const saved = (await vehicles.findById(ids.vehicle))!;
    if (rows.totalCount) { expect(saved.currentOdometer).toBe("100.00"); expect(race[1].status).toBe("rejected"); }
    else { expect(saved.currentOdometer).toBe("150.00"); expect(race[0]).toMatchObject({ status: "fulfilled", value: { success: false } }); }
  }, 180000);
});
