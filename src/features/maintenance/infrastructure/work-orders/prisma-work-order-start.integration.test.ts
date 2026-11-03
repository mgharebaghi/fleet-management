import { randomUUID } from "node:crypto";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../../test-support/database/test-database-config";
import { ManageMaintenanceReferences } from "../../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../reference-data/prisma-maintenance-reference-repository";
import { ManageWorkOrders } from "../../application/work-orders/manage-work-orders";
import { StartWorkOrder } from "../../application/work-orders/start-work-order";
import { CancelWorkOrder } from "../../application/work-orders/cancel-work-order";
import { PrismaWorkOrderRepository } from "./prisma-work-order-repository";
import { ManageTrips } from "../../../trip/application/manage-trips";
import { PrismaTripRepository } from "../../../trip/infrastructure/prisma-trip-repository";
import { ManageDrivers } from "../../../drivers/application/manage-drivers";
import { PrismaDriverRepository } from "../../../drivers/infrastructure/prisma-driver-repository";
const config = loadTestDatabaseConfig("TEST_DATABASE"), token = `IT-START-${randomUUID().slice(0, 8)}`;
const client = new PrismaClient({ adapter: new PrismaMssql(config) });
const repository = new PrismaWorkOrderRepository(client), orders = new ManageWorkOrders(repository), start = new StartWorkOrder(repository), cancel = new CancelWorkOrder(repository);
const trips = new ManageTrips(new PrismaTripRepository(client)), drivers = new ManageDrivers(new PrismaDriverRepository(client));
const ids = { brand: 0, model: 0, status: 0, vehicle: 0, type: 0, driverPerson: 0, passenger: 0, driver: 0, assignment: 0, location: 0, tripType: 0 };
const orderIds: number[] = [], requestIds: number[] = [];
async function order() {
  const result = await orders.create({ origin: "Direct", sourceId: null, vehicleId: ids.vehicle, maintenanceTypeId: ids.type, workLocation: "OnSite", workshopId: null, odometer: "100.01", engineHours: null, problem: token, diagnosis: null, description: null });
  if (!result.success) throw new Error(result.error.type); orderIds.push(result.id); return result.id;
}
async function tripFixture(executionStatus?: "Planned" | "InProgress") {
  const now = new Date(), planned = new Date(Date.now() + 3600000);
  const request = await client.tripRequest.create({ data: { RequestNo: `${token}-${requestIds.length}`, TripRequestTypeId: ids.tripType, RequestDateTime: now, RequestedTravelDateTime: planned, Status: executionStatus === "InProgress" ? "InProgress" : "New", CreatedAt: now } }); requestIds.push(request.TripRequestId);
  const trip = await client.trip.create({ data: { TripRequestId: request.TripRequestId, PassengerPersonId: ids.passenger, OriginLocationId: ids.location, DestinationLocationId: ids.location, RequestedPickupDateTime: planned } });
  const execution = executionStatus ? await client.tripExecution.create({ data: { TripId: trip.TripId, VehicleDriverAssignmentId: ids.assignment, Status: executionStatus, ActualPickupDateTime: executionStatus === "InProgress" ? now : null } }) : null;
  return { requestId: request.TripRequestId, tripId: trip.TripId, executionId: execution?.TripExecutionId ?? null };
}
describe.sequential("repair start and dispatch SQL Server interlock", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<Array<{ name: string; zone: string }>>`SELECT DB_NAME() name,CURRENT_TIMEZONE_ID() zone`;
    if (identity.name !== config.database || identity.zone !== "Iran Standard Time") throw new Error("Isolated SQL Server identity or time zone differs");
    ids.tripType = (await client.tripRequestType.findFirstOrThrow({ where: { TypeCode: "COMMON_ORIGIN_DESTINATION" } })).TripRequestTypeId;
    ids.brand = (await client.vehicleBrand.create({ data: { BrandName: token } })).BrandId;
    ids.model = (await client.vehicleModel.create({ data: { BrandId: ids.brand, ModelName: token } })).ModelId;
    ids.status = (await client.vehicleStatus.create({ data: { StatusName: token } })).VehicleStatusId;
    ids.vehicle = (await client.vehicle.create({ data: { VehicleCode: token, PlateNoLeftSide: "12", ModelId: ids.model, VehicleStatusId: ids.status, CurrentOdometer: "100.01" } })).VehicleId;
    const type = await new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(client)).saveType({ id: null, code: token, name: token, isActive: true, description: null }); if (!type.success) throw new Error(type.error.type); ids.type = type.value.id;
    ids.driverPerson = (await client.people.create({ data: { FirstName: token, LastName: "Driver", PersonnelNo: `${token}-d` } })).PersonId;
    ids.passenger = (await client.people.create({ data: { FirstName: token, LastName: "Passenger", PersonnelNo: `${token}-p` } })).PersonId;
    ids.driver = (await client.driver.create({ data: { PersonId: ids.driverPerson } })).DriverId;
    await client.driverLicense.create({ data: { DriverId: ids.driver, LicenseType: token, LicenseNo: token, IsActive: true } });
    ids.assignment = (await client.vehicleDriverAssignment.create({ data: { DriverId: ids.driver, VehicleId: ids.vehicle, FromDateTime: new Date(Date.now() - 86400000) } })).AssignmentId;
    ids.location = (await client.location.create({ data: { LocationName: token, LocationCode: token, IsActive: true } })).LocationId;
  }, 120000);
  afterEach(async () => {
    await client.tripExecution.deleteMany({ where: { Trip: { TripRequestId: { in: requestIds } } } });
    await client.trip.deleteMany({ where: { TripRequestId: { in: requestIds } } });
    await client.tripRequest.deleteMany({ where: { TripRequestId: { in: requestIds } } }); requestIds.length = 0;
    await client.workOrderTask.deleteMany({ where: { WorkOrderId: { in: orderIds } } });
    await client.workOrder.deleteMany({ where: { WorkOrderId: { in: orderIds } } }); orderIds.length = 0;
  }, 90000);
  afterAll(async () => {
    try {
      if (ids.assignment) await client.vehicleDriverAssignment.deleteMany({ where: { DriverId: ids.driver } });
      if (ids.driver) { await client.driverLicense.deleteMany({ where: { DriverId: ids.driver } }); await client.driver.delete({ where: { DriverId: ids.driver } }); }
      await client.people.deleteMany({ where: { PersonId: { in: [ids.driverPerson, ids.passenger] } } });
      if (ids.location) await client.location.delete({ where: { LocationId: ids.location } });
      if (ids.vehicle) await client.vehicle.delete({ where: { VehicleId: ids.vehicle } });
      if (ids.type) await client.maintenanceType.delete({ where: { MaintenanceTypeId: ids.type } });
      if (ids.model) await client.vehicleModel.delete({ where: { ModelId: ids.model } });
      if (ids.brand) await client.vehicleBrand.delete({ where: { BrandId: ids.brand } });
      if (ids.status) await client.vehicleStatus.delete({ where: { VehicleStatusId: ids.status } });
    } finally { await client.$disconnect(); }
  }, 120000);
  it("starts once with a server timestamp, blocks every dispatch path and releases after cancellation", async () => {
    const first = await order(), second = await order();
    expect(await start.execute(first, false)).toEqual({ success: true, id: first });
    const started = await repository.get(first); expect(started!.status).toBe("InProgress"); expect(Math.abs(Date.now() - new Date(started!.startedAt!).getTime())).toBeLessThan(300000);
    expect(await start.execute(first, false)).toEqual({ success: false, error: "ALREADY_STARTED" }); expect((await repository.get(first))!.startedAt).toBe(started!.startedAt);
    expect(await start.execute(second, false)).toEqual({ success: false, error: "ANOTHER_REPAIR" });
    const allocation = { driverId: ids.driver, vehicleId: ids.vehicle, fromDateTime: new Date(), toDateTime: null, startOdometer: null, endOdometer: null, description: null };
    expect(await drivers.assignVehicle(allocation)).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    expect(await drivers.updateAssignment({ ...allocation, assignmentId: ids.assignment })).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    const planned = await tripFixture();
    expect(await trips.assignInitialRequest({ tripRequestId: planned.requestId, passengers: [{ tripId: planned.tripId, vehicleDriverAssignmentId: ids.assignment, routes: [] }] })).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    const executionInput = { tripId: planned.tripId, tripExecutionId: null, vehicleDriverAssignmentId: ids.assignment, actualPickupDateTime: null, actualDropoffDateTime: null, startOdometer: null, endOdometer: null, status: "Planned", description: null };
    expect(await trips.saveExecution(executionInput)).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    const execution = await client.tripExecution.create({ data: { TripId: planned.tripId, VehicleDriverAssignmentId: ids.assignment, Status: "Planned" } });
    expect(await trips.changeRequestStatus(planned.requestId, "Assigned")).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    expect(await trips.changeRequestStatus(planned.requestId, "InProgress")).toMatchObject({ success: false });
    await client.tripRequest.update({ where: { TripRequestId: planned.requestId }, data: { Status: "Assigned" } });
    expect(await trips.changeRequestStatus(planned.requestId, "InProgress")).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    expect(await trips.saveExecution({ ...executionInput, tripExecutionId: execution.TripExecutionId, status: "InProgress" })).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
    expect((await client.tripExecution.findUniqueOrThrow({ where: { TripExecutionId: execution.TripExecutionId } })).Status).toBe("Planned");
    const vehicle = await client.vehicle.findUniqueOrThrow({ where: { VehicleId: ids.vehicle } }); expect(vehicle.VehicleStatusId).toBe(ids.status); expect(vehicle.CurrentOdometer!.toFixed(2)).toBe("100.01");
    expect(await cancel.execute(first, "Stopped for test")).toEqual({ success: true });
    expect((await trips.changeRequestStatus(planned.requestId, "InProgress")).success).toBe(true);
  }, 180000);
  it("rejects active travel without writing a repair start", async () => {
    await tripFixture("InProgress"); const id = await order();
    expect(await start.execute(id, true)).toEqual({ success: false, error: "ACTIVE_TRIP" }); expect(await repository.get(id)).toMatchObject({ status: "Open", startedAt: null });
  }, 90000);
  it("requires acknowledgement of planned travel, preserves its plan and blocks later dispatch", async () => {
    const planned = await tripFixture("Planned"), id = await order();
    expect(await start.execute(id, false)).toEqual({ success: false, error: "PLANNED_TRIPS_REQUIRE_CONFIRMATION", plannedTrips: 1 }); expect((await repository.get(id))!.startedAt).toBeNull();
    expect(await start.execute(id, true)).toEqual({ success: true, id });
    expect((await client.tripExecution.findUniqueOrThrow({ where: { TripExecutionId: planned.executionId! } })).Status).toBe("Planned");
    expect(await trips.changeRequestStatus(planned.requestId, "Assigned")).toEqual({ success: false, error: "VEHICLE_UNDER_REPAIR" });
  }, 90000);
  it("serializes repair start against travel start on the same physical vehicle", async () => {
    const planned = await tripFixture("Planned"), id = await order(); await client.tripRequest.update({ where: { TripRequestId: planned.requestId }, data: { Status: "Assigned" } });
    const results = await Promise.all([start.execute(id, true), trips.changeRequestStatus(planned.requestId, "InProgress")]); expect(results.filter(result => result.success)).toHaveLength(1);
    const [repair, execution] = await Promise.all([repository.get(id), client.tripExecution.findUniqueOrThrow({ where: { TripExecutionId: planned.executionId! } })]);
    expect(repair!.status === "InProgress" && execution.Status === "InProgress").toBe(false);
    expect(results.filter(result => !result.success)).toHaveLength(1);
  }, 90000);
  it("allows only one of two concurrent repair starts", async () => {
    const first = await order(), second = await order();
    const results = await Promise.all([start.execute(first, false), start.execute(second, false)]); expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([{ success: false, error: "ANOTHER_REPAIR" }]);
    expect(await client.workOrder.count({ where: { VehicleId: ids.vehicle, Status: "InProgress" } })).toBe(1);
  }, 90000);
});
