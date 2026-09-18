import { randomUUID } from "node:crypto";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../infrastructure/database/prisma/mssql-config";
import { ManageIncidents } from "../application/incident/manage-incidents";
import { ManageTrips } from "../application/manage-trips";
import { PrismaIncidentRepository } from "./incident/prisma-incident-repository";
import { PrismaTripRepository } from "./prisma-trip-repository";

const development = {
  server: process.env.DATABASE_SERVER?.toLowerCase(),
  port: process.env.DATABASE_PORT?.trim() || "1433",
  name: process.env.DATABASE_NAME?.toLowerCase(),
};
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (
  !/integrationtest/i.test(connection.database) ||
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
  const requestDateTime = new Date("2026-01-15T08:00:00Z");
  const requestedTravelDateTime = new Date("2026-02-01T08:00:00Z");
  const requestId = successfulId(
    await manage.createRequest({
      tripRequestTypeId: requestType.TripRequestTypeId,
      requestDateTime,
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
    "creates, lists, routes, assigns, executes, surveys and reads exact decimals",
    async () => {
      const fixture = await createCoreFixture();
      const details = await repository.details(fixture.requestId);
      expect(details).toMatchObject({
        requestNo: expect.stringMatching(/^TR-1404-\d{4}$/),
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
        requestDateTime: new Date("2026-01-15T08:00:00Z"),
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
        manage.createRequest({
          ...command,
          requestDateTime: new Date("2026-01-16T08:00:00Z"),
        }),
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
      expect(requestNos.every((value) => /^TR-1404-\d{4}$/.test(value ?? ""))).toBe(
        true,
      );
    },
    600_000,
  );
});
