import { randomUUID } from "node:crypto";
import { config } from "dotenv";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../infrastructure/database/prisma/mssql-config";
import { ManageIncidents } from "../application/incident/manage-incidents";
import { jalaliYearOf } from "../application/trip-lifecycle";
import { ManageTrips } from "../application/manage-trips";
import { PrismaIncidentRepository } from "./incident/prisma-incident-repository";
import { PrismaTripRepository } from "./prisma-trip-repository";

config({ path: ".env", quiet: true });
const development = {
  server: process.env.DATABASE_SERVER?.toLowerCase(),
  port: process.env.DATABASE_PORT?.trim() || "1433",
  name: process.env.DATABASE_NAME?.toLowerCase(),
};
config({ path: ".env.test.local", quiet: true });
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (
  connection.database.toLowerCase() !== "fleetmanagementdb_integrationtest" ||
  (connection.server.toLowerCase() === development.server &&
    String(connection.port) === development.port &&
    connection.database.toLowerCase() === development.name)
) {
  throw new Error(
    "Trip integration tests require an isolated IntegrationTest database.",
  );
}

const client = new PrismaClient({
  adapter: new PrismaMssql({
    ...connection,
    requestTimeout: 120_000,
    connectionTimeout: 60_000,
  }),
});
const repository = new PrismaTripRepository(client);
const manage = new ManageTrips(repository);
const incidents = new ManageIncidents(new PrismaIncidentRepository(client));
const requestIds: number[] = [];
const personIds: number[] = [];
const locationIds: number[] = [];
const assignmentIds: number[] = [];
const driverIds: number[] = [];
const licenseIds: number[] = [];
const vehicleIds: number[] = [];
const modelIds: number[] = [];
const brandIds: number[] = [];
const statusIds: number[] = [];
let verified = false;

function successfulId(
  result: Awaited<ReturnType<ManageTrips["createRequest"]>>,
) {
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error);
  return result.id;
}

async function createCoreFixture() {
  if (!verified) throw new Error("Trip database identity was not verified.");
  const token = randomUUID();
  const person = await client.people.create({
    data: {
      FirstName: "TripIntegration",
      LastName: token,
      PersonnelNo: `TRIP-${token}`,
      IsActive: true,
    },
  });
  personIds.push(person.PersonId);
  const origin = await client.location.create({
    data: {
      LocationName: `Origin-${token}`,
      LocationCode: `O-${token}`,
      IsActive: true,
    },
  });
  const destination = await client.location.create({
    data: {
      LocationName: `Destination-${token}`,
      LocationCode: `D-${token}`,
      IsActive: true,
    },
  });
  locationIds.push(origin.LocationId, destination.LocationId);
  const requestType = await client.tripRequestType.findFirstOrThrow({
    where: { TypeCode: "COMMON_ORIGIN_DESTINATION" },
  });
  const requestedTravelDateTime = new Date("2026-02-01T08:00:00Z");
  const requestId = successfulId(
    await manage.createRequest({
      tripRequestTypeId: requestType.TripRequestTypeId,
      requestedTravelDateTime,
      purpose: `Purpose-${token}`,
      description: "Integration request",
      passengers: [
        {
          passengerPersonId: person.PersonId,
          originLocationId: origin.LocationId,
          destinationLocationId: destination.LocationId,
          requestedPickupDateTime: requestedTravelDateTime,
          pickupOrder: 1,
          dropoffOrder: 1,
          status: null,
          description: "Passenger Trip",
        },
      ],
    }),
  );
  requestIds.push(requestId);
  const details = await repository.details(requestId);
  if (!details) throw new Error("Created Trip request was not readable.");
  return {
    token,
    person,
    origin,
    destination,
    requestId,
    tripId: details.passengers[0].tripId,
    requestedTravelDateTime,
  };
}

async function createAssignmentFixture(
  token: string,
  personId: number,
  requestedTravelDateTime: Date,
) {
  const driver = await client.driver.create({ data: { PersonId: personId } });
  driverIds.push(driver.DriverId);
  const license = await client.driverLicense.create({
    data: {
      DriverId: driver.DriverId,
      LicenseType: "Integration",
      LicenseNo: `LIC-${token}`,
      IssueDate: new Date("2025-01-01T00:00:00Z"),
      ExpireDate: new Date("2027-01-01T00:00:00Z"),
      IsActive: true,
    },
  });
  licenseIds.push(license.DriverLicenseId);
  const brand = await client.vehicleBrand.create({
    data: { BrandName: `TripBrand-${token}` },
  });
  brandIds.push(brand.BrandId);
  const model = await client.vehicleModel.create({
    data: { BrandId: brand.BrandId, ModelName: `TripModel-${token}` },
  });
  modelIds.push(model.ModelId);
  const vehicleStatus = await client.vehicleStatus.create({
    data: { StatusName: `TripStatus-${token}` },
  });
  statusIds.push(vehicleStatus.VehicleStatusId);
  const vehicle = await client.vehicle.create({
    data: {
      VehicleCode: `TRIP-VEHICLE-${token}`,
      PlateNoLeftSide: "12",
      PlateNoCenterChar: "ب",
      PlateNoRightSide: "345",
      PlateNoIranNo: "67",
      ModelId: model.ModelId,
      VehicleStatusId: vehicleStatus.VehicleStatusId,
      IsActive: true,
    },
  });
  vehicleIds.push(vehicle.VehicleId);
  const assignment = await client.vehicleDriverAssignment.create({
    data: {
      DriverId: driver.DriverId,
      VehicleId: vehicle.VehicleId,
      FromDateTime: new Date(
        requestedTravelDateTime.getTime() - 60 * 60 * 1000,
      ),
      ToDateTime: new Date(
        requestedTravelDateTime.getTime() + 8 * 60 * 60 * 1000,
      ),
    },
  });
  assignmentIds.push(assignment.AssignmentId);
  return assignment;
}

describe.sequential("Trip SQL Server integration", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<
      Array<{
        name: string;
        request: number | null;
        trip: number | null;
        execution: number | null;
        route: number | null;
        point: number | null;
        location: number | null;
      }>
    >`SELECT
        DB_NAME() AS name,
        OBJECT_ID(N'trip.TripRequest') AS request,
        OBJECT_ID(N'trip.Trip') AS trip,
        OBJECT_ID(N'trip.TripExecution') AS execution,
        OBJECT_ID(N'trip.Route') AS route,
        OBJECT_ID(N'trip.RoutePoint') AS point,
        OBJECT_ID(N'common.Location') AS location`;
    if (
      !identity ||
      identity.name.toLowerCase() !== connection.database.toLowerCase() ||
      [
        identity.request,
        identity.trip,
        identity.execution,
        identity.route,
        identity.point,
        identity.location,
      ].some((value) => value === null)
    ) {
      throw new Error("Trip IntegrationTest baseline is invalid.");
    }
    verified = true;
  }, 180_000);

  afterEach(async () => {
    if (!verified) return;
    const trips = await client.trip.findMany({
      where: { TripRequestId: { in: requestIds } },
      select: { TripId: true },
    });
    const tripIds = trips.map((trip) => trip.TripId);
    const executions = await client.tripExecution.findMany({
      where: { TripId: { in: tripIds } },
      select: { TripExecutionId: true },
    });
    const executionIds = executions.map(
      (execution) => execution.TripExecutionId,
    );
    await client.accident.deleteMany({
      where: { TripRequestId: { in: requestIds } },
    });
    await client.vehicleViolation.deleteMany({
      where: { TripRequestId: { in: requestIds } },
    });
    await client.routePoint.deleteMany({
      where: {
        Route: {
          OR: [
            { TripId: { in: tripIds } },
            { TripExecutionId: { in: executionIds } },
          ],
        },
      },
    });
    await client.route.deleteMany({
      where: {
        OR: [
          { TripId: { in: tripIds } },
          { TripExecutionId: { in: executionIds } },
        ],
      },
    });
    await client.tripExecution.deleteMany({
      where: { TripExecutionId: { in: executionIds } },
    });
    await client.trip.deleteMany({ where: { TripId: { in: tripIds } } });
    await client.tripRequest.deleteMany({
      where: { TripRequestId: { in: requestIds } },
    });
    await client.vehicleDriverAssignment.deleteMany({
      where: { AssignmentId: { in: assignmentIds } },
    });
    await client.driverLicense.deleteMany({
      where: { DriverLicenseId: { in: licenseIds } },
    });
    await client.driver.deleteMany({ where: { DriverId: { in: driverIds } } });
    await client.people.deleteMany({ where: { PersonId: { in: personIds } } });
    await client.vehicle.deleteMany({
      where: { VehicleId: { in: vehicleIds } },
    });
    await client.vehicleModel.deleteMany({
      where: { ModelId: { in: modelIds } },
    });
    await client.vehicleBrand.deleteMany({
      where: { BrandId: { in: brandIds } },
    });
    await client.vehicleStatus.deleteMany({
      where: { VehicleStatusId: { in: statusIds } },
    });
    await client.location.deleteMany({
      where: { LocationId: { in: locationIds } },
    });
    expect(
      await client.tripRequest.count({
        where: { TripRequestId: { in: requestIds } },
      }),
    ).toBe(0);
    requestIds.length =
      personIds.length =
      locationIds.length =
      assignmentIds.length =
      driverIds.length =
      licenseIds.length =
      vehicleIds.length =
      modelIds.length =
      brandIds.length =
      statusIds.length =
        0;
  }, 300_000);

  afterAll(async () => {
    await client.$disconnect();
  });

  it(
    "rolls back TripRequest and passenger Trips when work fails after creation",
    async () => {
      const fixture = await createCoreFixture();
      const requestType = await client.tripRequestType.findFirstOrThrow({
        where: { TypeCode: "COMMON_ORIGIN_DESTINATION" },
      });
      const rollbackToken = `Rollback-${randomUUID()}`;

      await expect(
        repository.atomic(async (session) => {
          await session.createRequest({
            tripRequestTypeId: requestType.TripRequestTypeId,
            requestNo: `RB-${randomUUID()}`,
            requestDateTime: new Date(),
            requestedTravelDateTime: fixture.requestedTravelDateTime,
            purpose: rollbackToken,
            description: "must roll back",
            status: "New",
            passengers: [
              {
                passengerPersonId: fixture.person.PersonId,
                originLocationId: fixture.origin.LocationId,
                destinationLocationId: fixture.destination.LocationId,
                requestedPickupDateTime: fixture.requestedTravelDateTime,
                pickupOrder: 1,
                dropoffOrder: 1,
                status: null,
                description: null,
              },
            ],
          });
          throw new Error("simulated failure after request and Trip creation");
        }),
      ).rejects.toThrow("simulated failure");

      expect(
        await client.tripRequest.count({ where: { Purpose: rollbackToken } }),
      ).toBe(0);
      expect(
        await client.trip.count({
          where: { TripRequest: { Purpose: rollbackToken } },
        }),
      ).toBe(0);
    },
    600_000,
  );

  it(
    "atomically creates a complete planned request with execution, route, and points",
    async () => {
      const fixture = await createCoreFixture();
      const assignment = await createAssignmentFixture(
        fixture.token,
        fixture.person.PersonId,
        fixture.requestedTravelDateTime,
      );
      const requestType = await client.tripRequestType.findFirstOrThrow({
        where: { TypeCode: "COMMON_ORIGIN_DESTINATION" },
      });

      const result = await manage.createCompleteRequest({
        tripRequestTypeId: requestType.TripRequestTypeId,
        requestedTravelDateTime: fixture.requestedTravelDateTime,
        purpose: `Complete-${fixture.token}`,
        description: "atomic complete request",
        passengers: [
          {
            passengerPersonId: fixture.person.PersonId,
            originLocationId: fixture.origin.LocationId,
            destinationLocationId: fixture.destination.LocationId,
            requestedPickupDateTime: fixture.requestedTravelDateTime,
            pickupOrder: 1,
            dropoffOrder: 1,
            status: null,
            description: null,
            vehicleDriverAssignmentId: assignment.AssignmentId,
            routes: [
              {
                routeName: `CompleteRoute-${fixture.token}`,
                alternativeNo: null,
                distanceKm: "12.50",
                estimatedDurationMinute: 30,
                isSelected: true,
                description: null,
                points: [
                  {
                    locationId: fixture.origin.LocationId,
                    trafficZone: null,
                    sequenceNo: 1,
                    distanceFromStartKm: "0.00",
                    description: null,
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(result.success).toBe(true);
      if (!result.success) throw new Error(result.error);
      requestIds.push(result.id);

      const details = await repository.details(result.id);
      expect(details).toMatchObject({
        status: "Assigned",
        passengers: [
          {
            passenger: { personId: fixture.person.PersonId },
            executions: [
              {
                status: "Planned",
                assignment: { assignmentId: assignment.AssignmentId },
              },
            ],
            routes: [
              {
                routeName: `CompleteRoute-${fixture.token}`,
                points: [
                  { location: { locationId: fixture.origin.LocationId } },
                ],
              },
            ],
          },
        ],
      });
    },
    600_000,
  );

  it(
    "creates, lists, routes, assigns, executes, surveys and reads exact decimals",
    async () => {
      const fixture = await createCoreFixture();
      const details = await repository.details(fixture.requestId);
      expect(details).toMatchObject({
        requestNo: expect.stringMatching(
          new RegExp(`^TR-${jalaliYearOf(details!.requestDateTime)}-\\d{4}$`),
        ),
        status: "New",
        requestType: { typeCode: "COMMON_ORIGIN_DESTINATION" },
        passengers: [
          {
            tripId: fixture.tripId,
            passenger: { personId: fixture.person.PersonId },
            origin: { locationId: fixture.origin.LocationId },
            destination: { locationId: fixture.destination.LocationId },
          },
        ],
      });
      const listed = await repository.list(fixture.token, "", 1);
      expect(listed.requests).toHaveLength(1);
      expect(listed.requests[0]).toMatchObject({
        tripRequestId: fixture.requestId,
        passengerCount: 1,
        origins: [fixture.origin.LocationName],
        destinations: [fixture.destination.LocationName],
      });
      const pendingCount = await repository.countPendingRequests();
      expect(pendingCount).toBeGreaterThanOrEqual(1);

      const routeId = successfulId(
        await manage.addRoute({
          tripId: fixture.tripId,
          tripExecutionId: null,
          routeName: "مسیر آزمون",
          alternativeNo: 1,
          distanceKm: "99999999.99",
          estimatedDurationMinute: 120,
          isSelected: true,
          description: null,
          points: [
            {
              locationId: fixture.origin.LocationId,
              trafficZone: "Zone",
              sequenceNo: 1,
              distanceFromStartKm: "0",
              description: null,
            },
            {
              locationId: fixture.destination.LocationId,
              trafficZone: null,
              sequenceNo: 2,
              distanceFromStartKm: "99999999.99",
              description: null,
            },
          ],
        }),
      );
      expect(routeId).toBeGreaterThan(0);
      const secondRouteId = successfulId(
        await manage.addRoute({
          tripId: fixture.tripId,
          tripExecutionId: null,
          routeName: "مسیر جایگزین",
          alternativeNo: 2,
          distanceKm: "10.00",
          estimatedDurationMinute: 20,
          isSelected: true,
          description: null,
          points: [
            {
              locationId: fixture.origin.LocationId,
              trafficZone: null,
              sequenceNo: 1,
              distanceFromStartKm: "0",
              description: null,
            },
          ],
        }),
      );
      const afterRoutes = await repository.details(fixture.requestId);
      expect(
        afterRoutes?.passengers[0].routes.map((route) => ({
          routeId: route.routeId,
          isSelected: route.isSelected,
          tripId: route.tripId,
          tripExecutionId: route.tripExecutionId,
        })),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            routeId,
            isSelected: false,
            tripId: fixture.tripId,
            tripExecutionId: null,
          }),
          expect.objectContaining({
            routeId: secondRouteId,
            isSelected: true,
            tripId: fixture.tripId,
            tripExecutionId: null,
          }),
        ]),
      );

      const assignment = await createAssignmentFixture(
        fixture.token,
        fixture.person.PersonId,
        fixture.requestedTravelDateTime,
      );
      const available = await repository.assignmentsActiveAt(
        fixture.requestedTravelDateTime,
      );
      expect(available).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            assignmentId: assignment.AssignmentId,
            hasEligibleLicense: true,
            vehicle: expect.objectContaining({ isActive: true }),
          }),
        ]),
      );

      const executionId = successfulId(
        await manage.saveExecution({
          tripId: fixture.tripId,
          tripExecutionId: null,
          vehicleDriverAssignmentId: assignment.AssignmentId,
          actualPickupDateTime: null,
          actualDropoffDateTime: null,
          startOdometer: null,
          endOdometer: null,
          status: "Completed",
          description: null,
        }),
      );
      expect(
        await incidents.recordAccident({
          tripRequestId: fixture.requestId,
          vehicleAssignmentId: assignment.AssignmentId,
          accidentDateTime: fixture.requestedTravelDateTime,
          location: "جاده",
          description: null,
          damageAmount: "10.00",
          driverFaultPercent: "0",
          policeReportNo: null,
          hasInjury: false,
        }),
      ).toEqual({ success: false, error: "ASSIGNMENT_NOT_ON_REQUEST" });
      expect(
        await manage.changeRequestStatus(fixture.requestId, "Assigned"),
      ).toEqual({ success: true, id: fixture.requestId });
      expect(
        await manage.saveExecution({
          tripId: fixture.tripId,
          tripExecutionId: executionId,
          vehicleDriverAssignmentId: assignment.AssignmentId,
          actualPickupDateTime: fixture.requestedTravelDateTime,
          actualDropoffDateTime: null,
          startOdometer: "9999999999999999.98",
          endOdometer: null,
          status: "InProgress",
          description: "Started",
        }),
      ).toEqual({ success: true, id: executionId });
      expect(
        await manage.changeRequestStatus(fixture.requestId, "InProgress"),
      ).toEqual({ success: true, id: fixture.requestId });
      expect(
        await manage.saveExecution({
          tripId: fixture.tripId,
          tripExecutionId: executionId,
          vehicleDriverAssignmentId: assignment.AssignmentId,
          actualPickupDateTime: fixture.requestedTravelDateTime,
          actualDropoffDateTime: new Date(
            fixture.requestedTravelDateTime.getTime() + 2 * 60 * 60 * 1000,
          ),
          startOdometer: "9999999999999999.98",
          endOdometer: "9999999999999999.99",
          status: "Completed",
          description: "Completed",
        }),
      ).toEqual({ success: true, id: executionId });
      expect(
        await manage.changeRequestStatus(fixture.requestId, "Completed"),
      ).toEqual({ success: true, id: fixture.requestId });
      expect(
        await manage.saveSurvey({
          tripExecutionId: executionId,
          passengerRating: 5,
          passengerComment: "مناسب",
          surveyDateTime: new Date("2026-02-02T08:00:00Z"),
        }),
      ).toEqual({ success: true, id: executionId });

      const completed = await repository.details(fixture.requestId);
      expect(completed?.status).toBe("Completed");
      expect(completed?.passengers[0].routes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            distanceKm: "99999999.99",
            points: [
              expect.objectContaining({ distanceFromStartKm: "0.00" }),
              expect.objectContaining({
                distanceFromStartKm: "99999999.99",
              }),
            ],
          }),
        ]),
      );
      expect(completed?.passengers[0].executions).toEqual([
        expect.objectContaining({
          tripExecutionId: executionId,
          startOdometer: "9999999999999999.98",
          endOdometer: "9999999999999999.99",
          status: "Completed",
          passengerRating: 5,
          passengerComment: "مناسب",
        }),
      ]);

      expect(
        await incidents.recordAccident({
          tripRequestId: fixture.requestId,
          vehicleAssignmentId: assignment.AssignmentId,
          accidentDateTime: fixture.requestedTravelDateTime,
          location: "جاده",
          description: null,
          damageAmount: "10.00",
          driverFaultPercent: "0",
          policeReportNo: null,
          hasInjury: false,
        }),
      ).toMatchObject({ success: true });

      const [statusDefault] = await client.$queryRaw<
        Array<{ constraintName: string; defaultDefinition: string | null }>
      >`SELECT
          dc.name AS constraintName,
          dc.definition AS defaultDefinition
        FROM sys.default_constraints dc
        JOIN sys.columns c ON c.default_object_id = dc.object_id
        JOIN sys.tables t ON t.object_id = dc.parent_object_id
        JOIN sys.schemas s ON s.schema_id = t.schema_id
        WHERE s.name = N'driver'
          AND t.name = N'VehicleViolation'
          AND c.name = N'Status'`;
      expect(statusDefault.constraintName).toBe("DF_VehicleViolation_Status");

      const violation = await incidents.recordViolation({
        tripRequestId: fixture.requestId,
        vehicleAssignmentId: assignment.AssignmentId,
        violationDateTime: fixture.requestedTravelDateTime,
        violationType: "سرعت غیرمجاز",
        location: null,
        amount: "250000.00",
        referenceNo: null,
        description: null,
      });
      expect(violation).toMatchObject({ success: true });
      if (!violation.success) throw new Error(violation.error);
      const [persistedViolation] = await client.$queryRaw<
        Array<{ status: string }>
      >`SELECT CONVERT(nvarchar(50), Status) AS status
        FROM driver.VehicleViolation
        WHERE ViolationId = ${violation.id}`;
      expect(persistedViolation.status).toBe("Unpaid");
    },
    600_000,
  );

  it(
    "allocates distinct year-scoped RequestNo values under concurrent creates",
    async () => {
      const first = await createCoreFixture();
      const secondPerson = await client.people.create({
        data: {
          FirstName: "TripConcurrent",
          LastName: first.token,
          PersonnelNo: `TRIP-C-${first.token}`,
          IsActive: true,
        },
      });
      personIds.push(secondPerson.PersonId);
      const requestType = await client.tripRequestType.findFirstOrThrow({
        where: { TypeCode: "COMMON_ORIGIN_DESTINATION" },
      });
      const command = {
        tripRequestTypeId: requestType.TripRequestTypeId,
        requestedTravelDateTime: new Date("2026-02-01T08:00:00Z"),
        purpose: null,
        description: null,
        passengers: [
          {
            passengerPersonId: secondPerson.PersonId,
            originLocationId: first.origin.LocationId,
            destinationLocationId: first.destination.LocationId,
            requestedPickupDateTime: null,
            pickupOrder: null,
            dropoffOrder: null,
            status: null,
            description: null,
          },
        ],
      };
      const [left, right] = await Promise.all([
        manage.createRequest(command),
        manage.createRequest(command),
      ]);
      expect(left.success && right.success).toBe(true);
      if (!left.success || !right.success) throw new Error("concurrent create");
      requestIds.push(left.id, right.id);
      const numbers = await Promise.all([
        repository.details(left.id),
        repository.details(right.id),
        repository.details(first.requestId),
      ]);
      const requestNos = numbers.map((row) => row?.requestNo);
      expect(new Set(requestNos).size).toBe(3);
      expect(
        numbers.every(
          (row) =>
            row !== null &&
            new RegExp(
              `^TR-${jalaliYearOf(row.requestDateTime)}-\\d{4}$`,
            ).test(row.requestNo),
        ),
      ).toBe(true);
    },
    600_000,
  );

  it(
    "supports adding, updating, and safely deleting passengers with history protection",
    async () => {
      const fixture = await createCoreFixture();

      // Create a second person
      const secondPerson = await client.people.create({
        data: {
          FirstName: "Passenger2",
          LastName: fixture.token,
          PersonnelNo: `P2-${fixture.token}`,
          IsActive: true,
        },
      });
      personIds.push(secondPerson.PersonId);

      // 1) Add passenger
      const addResult = await manage.addPassenger({
        tripRequestId: fixture.requestId,
        passenger: {
          passengerPersonId: secondPerson.PersonId,
          originLocationId: fixture.origin.LocationId,
          destinationLocationId: fixture.destination.LocationId,
          requestedPickupDateTime: new Date("2026-02-01T08:30:00Z"),
          pickupOrder: 2,
          dropoffOrder: 2,
          status: null,
          description: "مسافر دوم تستی",
        },
      });
      expect(addResult.success).toBe(true);
      if (!addResult.success) throw new Error(addResult.error);
      const newTripId = addResult.id;

      // Verify persistence via repository.details
      let details = await repository.details(fixture.requestId);
      expect(details?.passengers).toHaveLength(2);
      const addedTrip = details?.passengers.find((p) => p.tripId === newTripId);
      expect(addedTrip).toBeDefined();
      expect(addedTrip?.description).toBe("مسافر دوم تستی");

      // 2) Update passenger
      const updateResult = await manage.updatePassenger({
        tripRequestId: fixture.requestId,
        tripId: newTripId,
        passenger: {
          passengerPersonId: secondPerson.PersonId,
          originLocationId: fixture.origin.LocationId,
          destinationLocationId: fixture.destination.LocationId,
          requestedPickupDateTime: new Date("2026-02-01T09:00:00Z"),
          pickupOrder: 3,
          dropoffOrder: 3,
          status: null,
          description: "توضیحات ویرایش‌شده",
        },
      });
      expect(updateResult).toEqual({ success: true, id: newTripId });

      // Verify update in DB
      details = await repository.details(fixture.requestId);
      const updatedTrip = details?.passengers.find((p) => p.tripId === newTripId);
      expect(updatedTrip?.tripId).toBe(newTripId);
      expect(updatedTrip?.description).toBe("توضیحات ویرایش‌شده");
      expect(updatedTrip?.pickupOrder).toBe(3);

      // 3) Safe delete passenger (transactional cleanup)
      const deleteResult = await manage.deletePassenger({
        tripRequestId: fixture.requestId,
        tripId: newTripId,
      });
      expect(deleteResult).toEqual({ success: true, id: newTripId });

      // Verify passenger row was deleted
      details = await repository.details(fixture.requestId);
      expect(details?.passengers).toHaveLength(1);
      expect(details?.passengers.some((p) => p.tripId === newTripId)).toBe(false);
    },
    600_000,
  );
});
