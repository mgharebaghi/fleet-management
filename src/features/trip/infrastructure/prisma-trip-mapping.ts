import {
  Prisma,
  type PrismaClient,
} from "../../../generated/prisma/client";
import type {
  TripAssignmentReference,
  TripLocationReference,
  TripPassengerRecord,
} from "../application/trip-records";

export const personSelect = {
  PersonId: true,
  FirstName: true,
  LastName: true,
  PersonnelNo: true,
  Mobile: true,
  IsActive: true,
} satisfies Prisma.PeopleSelect;

export const locationSelect = {
  LocationId: true,
  LocationCode: true,
  LocationName: true,
  LocationType: true,
  Address: true,
  IsActive: true,
} satisfies Prisma.LocationSelect;

const vehicleSelect = {
  VehicleId: true,
  VehicleCode: true,
  PlateNoLeftSide: true,
  PlateNoCenterChar: true,
  PlateNoRightSide: true,
  PlateNoIranNo: true,
  IsActive: true,
  VehicleStatus: { select: { StatusName: true } },
  VehicleModel: {
    select: {
      ModelName: true,
      VehicleBrand: { select: { BrandName: true } },
      VehicleType: { select: { TypeName: true } },
    },
  },
} satisfies Prisma.VehicleSelect;

export const assignmentSelect = {
  AssignmentId: true,
  FromDateTime: true,
  ToDateTime: true,
  Driver: {
    select: {
      DriverId: true,
      People: { select: personSelect },
      DriverLicense: {
        select: {
          IsActive: true,
          IssueDate: true,
          ExpireDate: true,
        },
      },
    },
  },
  Vehicle: { select: vehicleSelect },
} satisfies Prisma.VehicleDriverAssignmentSelect;

const routeSelect = {
  RouteId: true,
  TripId: true,
  TripExecutionId: true,
  RouteName: true,
  AlternativeNo: true,
  EstimatedDurationMinute: true,
  IsSelected: true,
  Description: true,
  CreatedAt: true,
  RoutePoint: {
    select: {
      RoutePointId: true,
      TrafficZone: true,
      SequenceNo: true,
      Description: true,
      Location: { select: locationSelect },
    },
    orderBy: [{ SequenceNo: "asc" as const }, { RoutePointId: "asc" as const }],
  },
} satisfies Prisma.RouteSelect;

const executionSelect = {
  TripExecutionId: true,
  TripId: true,
  ActualPickupDateTime: true,
  ActualDropoffDateTime: true,
  Status: true,
  PassengerRating: true,
  PassengerComment: true,
  SurveyDateTime: true,
  Description: true,
  CreatedAt: true,
  VehicleDriverAssignment: { select: assignmentSelect },
  Route: { select: routeSelect, orderBy: { RouteId: "asc" as const } },
} satisfies Prisma.TripExecutionSelect;

export const tripSelect = {
  TripId: true,
  PassengerPersonId: true,
  OriginLocationId: true,
  DestinationLocationId: true,
  RequestedPickupDateTime: true,
  PickupOrder: true,
  DropoffOrder: true,
  Status: true,
  Description: true,
  People: { select: personSelect },
  Location_Trip_OriginLocationIdToLocation: { select: locationSelect },
  Location_Trip_DestinationLocationIdToLocation: { select: locationSelect },
  Route: { select: routeSelect, orderBy: { RouteId: "asc" as const } },
  TripExecution: {
    select: executionSelect,
    orderBy: { TripExecutionId: "desc" as const },
  },
} satisfies Prisma.TripSelect;

type AssignmentRow = Prisma.VehicleDriverAssignmentGetPayload<{
  select: typeof assignmentSelect;
}>;
type RouteRow = Prisma.RouteGetPayload<{ select: typeof routeSelect }>;
type ExecutionRow = Prisma.TripExecutionGetPayload<{
  select: typeof executionSelect;
}>;
type TripRow = Prisma.TripGetPayload<{ select: typeof tripSelect }>;
export type TripPrismaClient = Prisma.TransactionClient;
export type TripQueryClient = Pick<PrismaClient, "$queryRaw">;

export function mapPerson(row: Prisma.PeopleGetPayload<{ select: typeof personSelect }>) {
  return {
    personId: row.PersonId,
    firstName: row.FirstName,
    lastName: row.LastName,
    personnelNo: row.PersonnelNo,
    mobile: row.Mobile,
    isActive: row.IsActive,
  };
}

export function mapLocation(
  row: Prisma.LocationGetPayload<{ select: typeof locationSelect }>,
): TripLocationReference {
  return {
    locationId: row.LocationId,
    locationCode: row.LocationCode,
    locationName: row.LocationName,
    locationType: row.LocationType,
    address: row.Address,
    isActive: row.IsActive,
  };
}

function tehranDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function mapAssignment(
  row: AssignmentRow,
  activeAt: Date,
): TripAssignmentReference {
  const day = tehranDay(activeAt);
  const driver = row.Driver;
  return {
    assignmentId: row.AssignmentId,
    fromDateTime: row.FromDateTime,
    toDateTime: row.ToDateTime,
    driverId: driver.DriverId,
    driverFirstName: driver.People.FirstName,
    driverLastName: driver.People.LastName,
    driverPersonnelNo: driver.People.PersonnelNo,
    driverIsActive: driver.People.IsActive,
    hasEligibleLicense: driver.DriverLicense.some(
      (license) =>
        license.IsActive &&
        (license.IssueDate === null ||
          license.IssueDate.toISOString().slice(0, 10) <= day) &&
        (license.ExpireDate === null ||
          license.ExpireDate.toISOString().slice(0, 10) >= day),
    ),
    vehicle: {
      vehicleId: row.Vehicle.VehicleId,
      vehicleCode: row.Vehicle.VehicleCode,
      plateNoLeftSide: row.Vehicle.PlateNoLeftSide,
      plateNoCenterChar: row.Vehicle.PlateNoCenterChar,
      plateNoRightSide: row.Vehicle.PlateNoRightSide,
      plateNoIranNo: row.Vehicle.PlateNoIranNo,
      brandName: row.Vehicle.VehicleModel.VehicleBrand.BrandName,
      modelName: row.Vehicle.VehicleModel.ModelName,
      vehicleTypeName: row.Vehicle.VehicleModel.VehicleType?.TypeName ?? null,
      vehicleStatusName: row.Vehicle.VehicleStatus.StatusName,
      isActive: row.Vehicle.IsActive,
    },
  };
}

type DecimalMaps = {
  routeDistance: Map<number, string | null>;
  pointDistance: Map<number, string | null>;
  executionOdometer: Map<number, { start: string | null; end: string | null }>;
};

export async function readDecimalMaps(
  client: TripQueryClient,
  routes: RouteRow[],
  executions: ExecutionRow[],
): Promise<DecimalMaps> {
  const routeIds = routes.map((route) => route.RouteId);
  const pointIds = routes.flatMap((route) =>
    route.RoutePoint.map((point) => point.RoutePointId),
  );
  const executionIds = executions.map(
    (execution) => execution.TripExecutionId,
  );

  const routeRows =
    routeIds.length === 0
      ? []
      : await client.$queryRaw<
          Array<{ id: number; distance: string | null }>
        >(Prisma.sql`
          SELECT RouteId AS id, CONVERT(varchar(40), DistanceKm) AS distance
          FROM trip.Route
          WHERE RouteId IN (${Prisma.join(routeIds)})
        `);
  const pointRows =
    pointIds.length === 0
      ? []
      : await client.$queryRaw<
          Array<{ id: number; distance: string | null }>
        >(Prisma.sql`
          SELECT RoutePointId AS id,
                 CONVERT(varchar(40), DistanceFromStartKm) AS distance
          FROM trip.RoutePoint
          WHERE RoutePointId IN (${Prisma.join(pointIds)})
        `);
  const executionRows =
    executionIds.length === 0
      ? []
      : await client.$queryRaw<
          Array<{ id: number; start: string | null; end: string | null }>
        >(Prisma.sql`
          SELECT TripExecutionId AS id,
                 CONVERT(varchar(40), StartOdometer) AS start,
                 CONVERT(varchar(40), EndOdometer) AS [end]
          FROM trip.TripExecution
          WHERE TripExecutionId IN (${Prisma.join(executionIds)})
        `);

  return {
    routeDistance: new Map(
      routeRows.map((row) => [row.id, row.distance]),
    ),
    pointDistance: new Map(
      pointRows.map((row) => [row.id, row.distance]),
    ),
    executionOdometer: new Map(
      executionRows.map((row) => [
        row.id,
        { start: row.start, end: row.end },
      ]),
    ),
  };
}

function mapRoute(row: RouteRow, decimals: DecimalMaps) {
  return {
    routeId: row.RouteId,
    tripId: row.TripId,
    tripExecutionId: row.TripExecutionId,
    routeName: row.RouteName,
    alternativeNo: row.AlternativeNo,
    distanceKm: decimals.routeDistance.get(row.RouteId) ?? null,
    estimatedDurationMinute: row.EstimatedDurationMinute,
    isSelected: row.IsSelected,
    description: row.Description,
    createdAt: row.CreatedAt,
    points: row.RoutePoint.map((point) => ({
      routePointId: point.RoutePointId,
      location: mapLocation(point.Location),
      trafficZone: point.TrafficZone,
      sequenceNo: point.SequenceNo,
      distanceFromStartKm:
        decimals.pointDistance.get(point.RoutePointId) ?? null,
      description: point.Description,
    })),
  };
}

function mapExecution(
  row: ExecutionRow,
  scheduledDateTime: Date,
  decimals: DecimalMaps,
) {
  const odometer = decimals.executionOdometer.get(row.TripExecutionId);
  return {
    tripExecutionId: row.TripExecutionId,
    tripId: row.TripId,
    assignment: mapAssignment(row.VehicleDriverAssignment, scheduledDateTime),
    actualPickupDateTime: row.ActualPickupDateTime,
    actualDropoffDateTime: row.ActualDropoffDateTime,
    startOdometer: odometer?.start ?? null,
    endOdometer: odometer?.end ?? null,
    status: row.Status,
    passengerRating: row.PassengerRating,
    passengerComment: row.PassengerComment,
    surveyDateTime: row.SurveyDateTime,
    description: row.Description,
    createdAt: row.CreatedAt,
    routes: row.Route.map((route) => mapRoute(route, decimals)),
  };
}

export function mapTrip(
  row: TripRow,
  requestedTravelDateTime: Date,
  decimals: DecimalMaps,
): TripPassengerRecord {
  const scheduledDateTime =
    row.RequestedPickupDateTime ?? requestedTravelDateTime;
  return {
    tripId: row.TripId,
    passengerPersonId: row.PassengerPersonId,
    originLocationId: row.OriginLocationId,
    destinationLocationId: row.DestinationLocationId,
    requestedPickupDateTime: row.RequestedPickupDateTime,
    pickupOrder: row.PickupOrder,
    dropoffOrder: row.DropoffOrder,
    status: row.Status,
    description: row.Description,
    passenger: mapPerson(row.People),
    origin: mapLocation(row.Location_Trip_OriginLocationIdToLocation),
    destination: mapLocation(
      row.Location_Trip_DestinationLocationIdToLocation,
    ),
    routes: row.Route.map((route) => mapRoute(route, decimals)),
    executions: row.TripExecution.map((execution) =>
      mapExecution(execution, scheduledDateTime, decimals),
    ),
  };
}
