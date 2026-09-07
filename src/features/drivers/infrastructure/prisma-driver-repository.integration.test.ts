import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../infrastructure/database/prisma/mssql-config";
import { PrismaDriverRepository } from "./prisma-driver-repository";
import { ManageDrivers } from "../application/manage-drivers";
import { assignmentState } from "../application/assignment-rules";
import type { DriverResult, NewAssignment } from "../application/driver-records";

config({ path: ".env", quiet: true });
const development = { server: process.env.DATABASE_SERVER?.toLowerCase(), port: process.env.DATABASE_PORT || "1433", name: process.env.DATABASE_NAME?.toLowerCase() };
config({ path: ".env.test.local", quiet: true });
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (connection.database.toLowerCase() !== "fleetmanagementdb_integrationtest" || (connection.server.toLowerCase() === development.server && String(connection.port) === development.port && connection.database.toLowerCase() === development.name)) throw new Error("Drivers integration tests require an isolated integration database.");
const client = new PrismaClient({ adapter: new PrismaMssql(connection) });
const repository = new PrismaDriverRepository(client);
const useCase = new ManageDrivers(repository);
const people: number[] = [], vehicles: number[] = [], models: number[] = [], brands: number[] = [], statuses: number[] = [];
let verified = false;
function id(result: DriverResult): number { expect(result.success).toBe(true); if (!result.success) throw new Error(result.error); return result.id; }
async function fixture() {
  if (!verified) throw new Error("Database identity not verified.");
  const token = randomUUID();
  const person = await client.people.create({ data: { FirstName: "DriverTest", LastName: token, PersonnelNo: `IT-${token}` } }); people.push(person.PersonId);
  const brand = await client.vehicleBrand.create({ data: { BrandName: `IT-${token}` } }); brands.push(brand.BrandId);
  const model = await client.vehicleModel.create({ data: { ModelName: `IT-${token}`, BrandId: brand.BrandId } }); models.push(model.ModelId);
  const status = await client.vehicleStatus.create({ data: { StatusName: `IT-${token}` } }); statuses.push(status.VehicleStatusId);
  const vehicle = await client.vehicle.create({ data: { VehicleCode: `IT-${token}`, ModelId: model.ModelId, VehicleStatusId: status.VehicleStatusId, PlateNoLeftSide: "12" } }); vehicles.push(vehicle.VehicleId);
  const driverId = id(await useCase.defineDriver(person.PersonId));
  const license = { driverId, licenseType: "Heavy", licenseNo: token, issueDate: null, expireDate: null, isActive: true };
  id(await useCase.addLicense(license));
  const input: NewAssignment = { driverId, vehicleId: vehicle.VehicleId, fromDateTime: new Date("2026-01-01T08:00:00Z"), toDateTime: null, startOdometer: null, endOdometer: null, description: null };
  return { personId: person.PersonId, driverId, vehicleId: vehicle.VehicleId, token, input, license };
}
describe.sequential("Drivers SQL Server integration", () => {
  beforeAll(async () => {
    const [db] = await client.$queryRaw<Array<{ name: string; driver: number | null; license: number | null; assignment: number | null }>>`SELECT DB_NAME() AS name, OBJECT_ID('driver.Driver') AS driver, OBJECT_ID('driver.DriverLicense') AS license, OBJECT_ID('driver.VehicleDriverAssignment') AS assignment`;
    if (!db || db.name.toLowerCase() !== connection.database.toLowerCase() || db.driver === null || db.license === null || db.assignment === null) throw new Error("Drivers integration baseline is missing.");
    verified = true;
  });
  afterEach(async () => {
    if (!verified) return;
    const drivers = await client.driver.findMany({ where: { PersonId: { in: people } }, select: { DriverId: true } });
    const ids = drivers.map(d => d.DriverId);
    await client.vehicleDriverAssignment.deleteMany({ where: { DriverId: { in: ids } } });
    await client.driverLicense.deleteMany({ where: { DriverId: { in: ids } } });
    await client.driver.deleteMany({ where: { DriverId: { in: ids } } });
    expect(await client.vehicleDriverAssignment.count({ where: { DriverId: { in: ids } } })).toBe(0);
    expect(await client.driverLicense.count({ where: { DriverId: { in: ids } } })).toBe(0);
    expect(await client.driver.count({ where: { DriverId: { in: ids } } })).toBe(0);
    await client.people.deleteMany({ where: { PersonId: { in: people } } });
    await client.vehicle.deleteMany({ where: { VehicleId: { in: vehicles } } });
    await client.vehicleModel.deleteMany({ where: { ModelId: { in: models } } });
    await client.vehicleBrand.deleteMany({ where: { BrandId: { in: brands } } });
    await client.vehicleStatus.deleteMany({ where: { VehicleStatusId: { in: statuses } } });
    expect(await client.people.count({ where: { PersonId: { in: people } } })).toBe(0);
    expect(await client.vehicle.count({ where: { VehicleId: { in: vehicles } } })).toBe(0);
    people.length = vehicles.length = models.length = brands.length = statuses.length = 0;
  });
  afterAll(async () => { await client.$disconnect(); });

  it("maps person references, defaults and licenses and filters already-defined people", async () => {
    const f = await fixture();
    const details = await repository.details(f.driverId);
    expect(details).toMatchObject({ personId: f.personId, isActive: true, licenses: [{ licenseNo: f.token, issueDate: null, expireDate: null, isActive: true }] });
    expect((await repository.list(f.token, 1)).drivers.map(d => d.driverId)).toEqual([f.driverId]);
    expect((await repository.availablePeople()).some(p => p.personId === f.personId)).toBe(false);
    expect((await repository.availableVehicles()).some(v => v.vehicleId === f.vehicleId)).toBe(true);
    expect(await useCase.defineDriver(f.personId)).toEqual({ success: false, error: "DRIVER_EXISTS" });
    expect(await repository.atomic(s => s.person(-1))).toBeNull();
    expect(await repository.atomic(s => s.vehicle(-1))).toBeNull();
    await expect(client.driver.create({ data: { PersonId: -1 } })).rejects.toMatchObject({ code: "P2003" });
  });
  it("rejects duplicate license numbers and retains multiple expired/inactive licenses", async () => {
    const f = await fixture();
    expect(await useCase.addLicense(f.license)).toEqual({ success: false, error: "LICENSE_EXISTS" });
    id(await useCase.addLicense({ ...f.license, licenseNo: `old-${f.token}`, isActive: false, issueDate: new Date("2020-01-01"), expireDate: new Date("2021-01-01") }));
    expect((await repository.details(f.driverId))?.licenses).toHaveLength(2);
  });
  it("updates and deletes an owned license", async () => {
    const f = await fixture();
    const existing = (await repository.details(f.driverId))!.licenses[0];
    const updatedNo = `edited-${f.token}`;
    expect(await useCase.updateLicense({ ...existing, licenseType: "Edited", licenseNo: updatedNo, isActive: false })).toEqual({ success: true, id: existing.licenseId });
    expect((await repository.details(f.driverId))!.licenses[0]).toMatchObject({ licenseId: existing.licenseId, licenseType: "Edited", licenseNo: updatedNo, isActive: false });
    expect(await useCase.deleteLicense(f.driverId, existing.licenseId)).toEqual({ success: true, id: existing.licenseId });
    expect((await repository.details(f.driverId))!.licenses).toHaveLength(0);
  });
  it("preserves exact decimal text and closes the same current record into history", async () => {
    const f = await fixture();
    const assignmentId = id(await useCase.assignVehicle({ ...f.input, startOdometer: "9999999999999999.98" }));
    const before = (await repository.details(f.driverId))!.assignments[0];
    expect(before.startOdometer).toBe("9999999999999999.98");
    expect(assignmentState(before, new Date("2026-01-02"))).toBe("current");
    id(await useCase.closeAssignment(assignmentId, new Date("2026-01-02T08:00:00Z"), "9999999999999999.99"));
    const after = (await repository.details(f.driverId))!.assignments;
    expect(after).toHaveLength(1); expect(after[0]).toMatchObject({ assignmentId, endOdometer: "9999999999999999.99" });
    expect(assignmentState(after[0], new Date("2026-01-02T08:00:00Z"))).toBe("past");
    expect(await useCase.closeAssignment(assignmentId, new Date("2026-01-03"), null)).toEqual({ success: false, error: "ASSIGNMENT_CLOSED" });
  });
  it("deletes both a current and a future assignment", async () => {
    const f = await fixture();
    // A future assignment can only coexist with a current one if the current
    // one has a defined end at or before the future one's start (two open-ended
    // rows for the same driver would overlap forever and rightly conflict).
    const currentEnd = new Date(Date.now() + 60 * 60 * 1000);
    const currentId = id(await useCase.assignVehicle({ ...f.input, toDateTime: currentEnd }));
    const futureId = id(await useCase.assignVehicle({ ...f.input, fromDateTime: currentEnd, toDateTime: null }));
    expect(await useCase.deleteAssignment(f.driverId, futureId)).toEqual({ success: true, id: futureId });
    expect(await useCase.deleteAssignment(f.driverId, currentId)).toEqual({ success: true, id: currentId });
    expect((await repository.details(f.driverId))!.assignments).toHaveLength(0);
  });
  it("closes an assignment then allows a new one starting at or after its end, and rejects one starting before", async () => {
    const f = await fixture();
    const assignmentId = id(await useCase.assignVehicle(f.input));
    const end = new Date(Date.now() + 60 * 60 * 1000);
    id(await useCase.closeAssignment(assignmentId, end, null));

    // Previous assignment still active at the new start (1ms before it ends) -> reject.
    expect(await useCase.assignVehicle({ ...f.input, fromDateTime: new Date(end.getTime() - 1), toDateTime: null })).toEqual({ success: false, error: "DRIVER_OVERLAP" });

    // Previous end exactly equals the new start -> allow (half-open interval: the boundary instant is the handover).
    const boundaryId = id(await useCase.assignVehicle({ ...f.input, fromDateTime: end, toDateTime: new Date(end.getTime() + 60_000) }));

    // Previous ended strictly before the new start -> allow.
    const afterId = id(await useCase.assignVehicle({ ...f.input, fromDateTime: new Date(end.getTime() + 60 * 60 * 1000), toDateTime: null }));

    const rows = (await repository.details(f.driverId))!.assignments;
    const numericAsc = (a: number, b: number) => a - b;
    expect(rows.map(r => r.assignmentId).sort(numericAsc)).toEqual([assignmentId, boundaryId, afterId].sort(numericAsc));
  });
  it("keeps a completed assignment immutable to both delete and edit", async () => {
    const f = await fixture();
    const assignmentId = id(await useCase.assignVehicle(f.input));
    id(await useCase.closeAssignment(assignmentId, new Date("2026-01-02T08:00:00Z"), null));
    expect(await useCase.deleteAssignment(f.driverId, assignmentId)).toEqual({ success: false, error: "ASSIGNMENT_NOT_DELETABLE" });
    expect(await useCase.updateAssignment({ ...f.input, assignmentId, description: "should not apply" })).toEqual({ success: false, error: "ASSIGNMENT_IMMUTABLE" });
    const remaining = (await repository.details(f.driverId))!.assignments;
    expect(remaining).toEqual([expect.objectContaining({ assignmentId, description: null })]);
  });
  it("updates the same assignment without deleting history and still rejects overlap", async () => {
    // Both windows sit in the future relative to real time, so the edited row
    // stays current (not yet completed/immutable) for the whole test.
    const a = await fixture(), b = await fixture();
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    const extendedEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const secondStart = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const secondEnd = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const firstId = id(await useCase.assignVehicle({ ...a.input, toDateTime: soon }));
    id(await useCase.assignVehicle({ ...a.input, fromDateTime: secondStart, toDateTime: secondEnd }));
    const updated = { ...a.input, assignmentId: firstId, vehicleId: b.vehicleId, toDateTime: extendedEnd, startOdometer: "10.10", endOdometer: "20.20", description: "corrected" };
    expect(await useCase.updateAssignment(updated)).toEqual({ success: true, id: firstId });
    expect((await repository.details(a.driverId))!.assignments).toHaveLength(2);
    expect((await repository.details(a.driverId))!.assignments.find(row => row.assignmentId === firstId)).toMatchObject({ vehicleId: b.vehicleId, startOdometer: "10.10", endOdometer: "20.20", description: "corrected" });
    const overlappingStart = new Date(secondStart.getTime() + 30 * 60 * 1000);
    const overlappingEnd = new Date(secondEnd.getTime() + 60 * 60 * 1000);
    expect(await useCase.updateAssignment({ ...updated, fromDateTime: overlappingStart, toDateTime: overlappingEnd })).toEqual({ success: false, error: "DRIVER_OVERLAP" });
  });
  it("detects driver and vehicle overlap including future open periods and allows adjacent boundaries", async () => {
    const a = await fixture(), b = await fixture();
    const end = new Date("2026-02-01T08:00:00Z");
    id(await useCase.assignVehicle({ ...a.input, toDateTime: end }));
    expect(await useCase.assignVehicle({ ...a.input, vehicleId: b.vehicleId })).toEqual({ success: false, error: "DRIVER_OVERLAP" });
    expect(await useCase.assignVehicle({ ...b.input, vehicleId: a.vehicleId })).toEqual({ success: false, error: "VEHICLE_OVERLAP" });
    id(await useCase.assignVehicle({ ...a.input, fromDateTime: end }));
    expect(await useCase.assignVehicle({ ...a.input, fromDateTime: new Date("2099-01-01") })).toEqual({ success: false, error: "DRIVER_OVERLAP" });
    const rows = (await repository.details(a.driverId))!.assignments;
    expect(rows.map(r => r.fromDateTime)).toEqual([end, a.input.fromDateTime]);
  });
  it("rejects simultaneous overlapping writes on two connections", async () => {
    const f = await fixture();
    const second = new PrismaClient({ adapter: new PrismaMssql(connection) });
    try {
      const results = await Promise.all([useCase.assignVehicle(f.input), new ManageDrivers(new PrismaDriverRepository(second)).assignVehicle(f.input)]);
      expect(results.filter(r => r.success)).toHaveLength(1);
      expect(results.filter(r => !r.success)).toEqual([{ success: false, error: "DRIVER_OVERLAP" }]);
      expect((await repository.details(f.driverId))?.assignments).toHaveLength(1);
    } finally { await second.$disconnect(); }
  });
  it("serializes duplicate license registration", async () => {
    const f = await fixture();
    const value = { ...f.license, licenseNo: `new-${f.token}` };
    const results = await Promise.all([useCase.addLicense(value), useCase.addLicense(value)]);
    expect(results.filter(r => r.success)).toHaveLength(1);
    expect(results.filter(r => !r.success)).toEqual([{ success: false, error: "LICENSE_EXISTS" }]);
  });
  it("rolls back writes on an unexpected failure and releases its lock", async () => {
    const f = await fixture();
    await expect(repository.atomic(async s => { await s.createAssignment(f.input); throw new Error("rollback-test"); })).rejects.toThrow("rollback-test");
    expect((await repository.details(f.driverId))?.assignments).toHaveLength(0);
    id(await useCase.assignVehicle(f.input));
  });
  it("preserves history when the person becomes inactive and blocks new assignments", async () => {
    const f = await fixture();
    id(await useCase.assignVehicle({ ...f.input, toDateTime: new Date("2026-01-02") }));
    await client.people.update({ where: { PersonId: f.personId }, data: { IsActive: false } });
    expect((await repository.details(f.driverId))?.assignments).toHaveLength(1);
    expect(await useCase.assignVehicle({ ...f.input, fromDateTime: new Date("2026-02-01") })).toEqual({ success: false, error: "PERSON_INACTIVE" });
  });
});
