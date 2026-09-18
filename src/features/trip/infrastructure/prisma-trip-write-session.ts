import {
  Prisma,
} from "../../../generated/prisma/client";
import type { TripWriteSession } from "../application/trip-repository";
import type {
  CreateTripRequestInput,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
} from "../application/trip-records";
import type { TripRequestStatus } from "../application/trip-lifecycle";
import {
  assignmentSelect,
  locationSelect,
  mapAssignment,
  mapLocation,
  mapPerson,
  mapTrip,
  personSelect,
  readDecimalMaps,
  tripSelect,
  type TripPrismaClient,
} from "./prisma-trip-mapping";

export class PrismaTripWriteSession implements TripWriteSession {
  constructor(private readonly client: TripPrismaClient) {}

  async requestType(id: number) {
    const row = await this.client.tripRequestType.findUnique({
      where: { TripRequestTypeId: id },
    });
    return row
      ? {
          tripRequestTypeId: row.TripRequestTypeId,
          typeCode: row.TypeCode,
          typeName: row.TypeName,
          description: row.Description,
        }
      : null;
  }

  async person(id: number) {
    const row = await this.client.people.findUnique({
      where: { PersonId: id },
      select: personSelect,
    });
    return row ? mapPerson(row) : null;
  }

  async location(id: number) {
    const row = await this.client.location.findUnique({
      where: { LocationId: id },
      select: locationSelect,
    });
    return row ? mapLocation(row) : null;
  }

  async trip(id: number) {
    const row = await this.client.trip.findUnique({
      where: { TripId: id },
      select: {
        ...tripSelect,
        TripRequest: {
          select: {
            TripRequestId: true,
            Status: true,
            RequestedTravelDateTime: true,
          },
        },
      },
    });
    if (!row) return null;
    const allRoutes = [
      ...row.Route,
      ...row.TripExecution.flatMap((execution) => execution.Route),
    ];
    const decimals = await readDecimalMaps(
      this.client,
      allRoutes,
      row.TripExecution,
    );
    return {
      ...mapTrip(row, row.TripRequest.RequestedTravelDateTime, decimals),
      requestedTravelDateTime: row.TripRequest.RequestedTravelDateTime,
      requestId: row.TripRequest.TripRequestId,
      requestStatus: row.TripRequest.Status,
    };
  }

  async execution(id: number) {
    const row = await this.client.tripExecution.findUnique({
      where: { TripExecutionId: id },
      select: {
        TripExecutionId: true,
        TripId: true,
        Status: true,
        ActualPickupDateTime: true,
        ActualDropoffDateTime: true,
        VehicleDriverAssignmentId: true,
        Trip: {
          select: {
            TripRequest: {
              select: { TripRequestId: true, Status: true },
            },
          },
        },
      },
    });
    return row
      ? {
          tripExecutionId: row.TripExecutionId,
          tripId: row.TripId,
          status: row.Status,
          actualPickupDateTime: row.ActualPickupDateTime,
          actualDropoffDateTime: row.ActualDropoffDateTime,
          vehicleDriverAssignmentId: row.VehicleDriverAssignmentId,
          requestId: row.Trip.TripRequest.TripRequestId,
          requestStatus: row.Trip.TripRequest.Status,
        }
      : null;
  }

  async requestLifecycle(id: number) {
    const row = await this.client.tripRequest.findUnique({
      where: { TripRequestId: id },
      select: {
        Status: true,
        Trip: {
          select: {
            TripId: true,
            TripExecution: {
              select: {
                TripExecutionId: true,
                Status: true,
                ActualPickupDateTime: true,
              },
            },
          },
        },
      },
    });
    return row
      ? {
          status: row.Status,
          passengers: row.Trip.map((trip) => ({
            tripId: trip.TripId,
            executions: trip.TripExecution.map((execution) => ({
              tripExecutionId: execution.TripExecutionId,
              status: execution.Status,
              actualPickupDateTime: execution.ActualPickupDateTime,
            })),
          })),
        }
      : null;
  }

  async requestNumbers(jalaliYear: number) {
    const prefix = `TR-${String(jalaliYear).padStart(4, "0")}-`;
    const rows = await this.client.$queryRaw<Array<{ requestNo: string }>>`
      SELECT RequestNo AS requestNo
      FROM trip.TripRequest
      WHERE UPPER(LTRIM(RTRIM(RequestNo))) LIKE ${`${prefix}%`}
    `;
    return rows.map((row) => row.requestNo);
  }

  async requestNoExists(requestNo: string) {
    const rows = await this.client.$queryRaw<Array<{ id: number }>>`
      SELECT TOP (1) TripRequestId AS id
      FROM trip.TripRequest
      WHERE UPPER(LTRIM(RTRIM(RequestNo))) = ${requestNo}
    `;
    return rows.length > 0;
  }

  async assignment(id: number, activeAt: Date) {
    const row = await this.client.vehicleDriverAssignment.findUnique({
      where: { AssignmentId: id },
      select: assignmentSelect,
    });
    return row ? mapAssignment(row, activeAt) : null;
  }

  async createRequest(input: CreateTripRequestInput) {
    const row = await this.client.tripRequest.create({
      data: {
        RequestNo: input.requestNo,
        TripRequestTypeId: input.tripRequestTypeId,
        RequestDateTime: input.requestDateTime,
        RequestedTravelDateTime: input.requestedTravelDateTime,
        Purpose: input.purpose,
        Status: input.status,
        Description: input.description,
        CreatedAt: new Date(),
        Trip: {
          create: input.passengers.map((passenger) => ({
            PassengerPersonId: passenger.passengerPersonId,
            OriginLocationId: passenger.originLocationId,
            DestinationLocationId: passenger.destinationLocationId,
            RequestedPickupDateTime: passenger.requestedPickupDateTime,
            PickupOrder: passenger.pickupOrder,
            DropoffOrder: passenger.dropoffOrder,
            Status: passenger.status,
            Description: passenger.description,
          })),
        },
      },
      select: { TripRequestId: true },
    });
    return row.TripRequestId;
  }

  async updateRequestStatus(id: number, status: TripRequestStatus) {
    await this.client.tripRequest.update({
      where: { TripRequestId: id },
      data: { Status: status },
    });
  }

  async cancelPlannedExecutions(tripRequestId: number) {
    await this.client.tripExecution.updateMany({
      where: {
        Status: "Planned",
        ActualPickupDateTime: null,
        Trip: { TripRequestId: tripRequestId },
      },
      data: { Status: "Cancelled" },
    });
  }

  async deselectOtherSelectedRoutes(input: {
    tripId: number | null;
    tripExecutionId: number | null;
  }) {
    if (input.tripId !== null && input.tripExecutionId !== null) {
      return;
    }
    await this.client.route.updateMany({
      where:
        input.tripExecutionId === null
          ? {
              TripId: input.tripId ?? undefined,
              TripExecutionId: null,
              IsSelected: true,
            }
          : {
              TripExecutionId: input.tripExecutionId,
              TripId: null,
              IsSelected: true,
            },
      data: { IsSelected: false },
    });
  }

  async createRoute(input: NewTripRoute) {
    const row = await this.client.route.create({
      data: {
        TripId: input.tripExecutionId === null ? input.tripId : null,
        TripExecutionId: input.tripExecutionId,
        RouteName: input.routeName,
        AlternativeNo: input.alternativeNo,
        DistanceKm:
          input.distanceKm === null
            ? null
            : new Prisma.Decimal(input.distanceKm),
        EstimatedDurationMinute: input.estimatedDurationMinute,
        IsSelected: input.isSelected,
        Description: input.description,
        RoutePoint: {
          create: input.points.map((point) => ({
            LocationId: point.locationId,
            TrafficZone: point.trafficZone,
            SequenceNo: point.sequenceNo,
            DistanceFromStartKm:
              point.distanceFromStartKm === null
                ? null
                : new Prisma.Decimal(point.distanceFromStartKm),
            Description: point.description,
          })),
        },
      },
      select: { RouteId: true },
    });
    return row.RouteId;
  }

  async createExecution(input: SaveTripExecutionInput) {
    const row = await this.client.tripExecution.create({
      data: {
        TripId: input.tripId,
        VehicleDriverAssignmentId: input.vehicleDriverAssignmentId,
        ActualPickupDateTime: input.actualPickupDateTime,
        ActualDropoffDateTime: input.actualDropoffDateTime,
        StartOdometer:
          input.startOdometer === null
            ? null
            : new Prisma.Decimal(input.startOdometer),
        EndOdometer:
          input.endOdometer === null
            ? null
            : new Prisma.Decimal(input.endOdometer),
        Status: input.status,
        Description: input.description,
        CreatedAt: new Date(),
      },
      select: { TripExecutionId: true },
    });
    return row.TripExecutionId;
  }

  async updateExecution(
    input: SaveTripExecutionInput & { tripExecutionId: number },
  ) {
    await this.client.tripExecution.update({
      where: { TripExecutionId: input.tripExecutionId },
      data: {
        VehicleDriverAssignmentId: input.vehicleDriverAssignmentId,
        ActualPickupDateTime: input.actualPickupDateTime,
        ActualDropoffDateTime: input.actualDropoffDateTime,
        StartOdometer:
          input.startOdometer === null
            ? null
            : new Prisma.Decimal(input.startOdometer),
        EndOdometer:
          input.endOdometer === null
            ? null
            : new Prisma.Decimal(input.endOdometer),
        Status: input.status,
        Description: input.description,
      },
    });
  }

  async updateSurvey(input: SavePassengerSurveyInput) {
    await this.client.tripExecution.update({
      where: { TripExecutionId: input.tripExecutionId },
      data: {
        PassengerRating: input.passengerRating,
        PassengerComment: input.passengerComment,
        SurveyDateTime: input.surveyDateTime,
      },
    });
  }
}
