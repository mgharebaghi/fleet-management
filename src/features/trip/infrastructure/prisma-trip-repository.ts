import {
  Prisma,
  type PrismaClient,
} from "../../../generated/prisma/client";
import type {
  TripRepository,
  TripWriteSession,
} from "../application/trip-repository";
import type {
  CreateTripRequestInput,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  TripAssignmentReference,
  TripLocationReference,
  TripPassengerRecord,
  TripRequestDetails,
} from "../application/trip-records";
import {
  TRIP_REQUEST_STATUSES,
  type TripRequestStatus,
} from "../application/trip-lifecycle";

const personSelect = {
  PersonId: true,
  FirstName: true,
  LastName: true,
  PersonnelNo: true,
  Mobile: true,
  IsActive: true,
} satisfies Prisma.PeopleSelect;

const locationSelect = {
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
  VehicleStatus: { select: { StatusName: true } },
  VehicleModel: {
    select: {
      ModelName: true,
      VehicleBrand: { select: { BrandName: true } },
      VehicleType: { select: { TypeName: true } },
    },
  },
} satisfies Prisma.VehicleSelect;

const assignmentSelect = {
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

const tripSelect = {
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
type Client = Prisma.TransactionClient;
type QueryClient = Pick<PrismaClient, "$queryRaw">;

function mapPerson(row: Prisma.PeopleGetPayload<{ select: typeof personSelect }>) {
  return {
    personId: row.PersonId,
    firstName: row.FirstName,
    lastName: row.LastName,
    personnelNo: row.PersonnelNo,
    mobile: row.Mobile,
    isActive: row.IsActive,
  };
}

function mapLocation(
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

function mapAssignment(
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
    },
  };
}

type DecimalMaps = {
  routeDistance: Map<number, string | null>;
  pointDistance: Map<number, string | null>;
  executionOdometer: Map<number, { start: string | null; end: string | null }>;
};

async function readDecimalMaps(
  client: QueryClient,
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

function mapTrip(
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

class PrismaTripWriteSession implements TripWriteSession {
  constructor(private readonly client: Client) {}

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
        TripRequest: { select: { RequestedTravelDateTime: true } },
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
      },
    });
    return row
      ? {
          tripExecutionId: row.TripExecutionId,
          tripId: row.TripId,
          status: row.Status,
          actualPickupDateTime: row.ActualPickupDateTime,
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
            TripExecution: {
              select: { Status: true, ActualPickupDateTime: true },
            },
          },
        },
      },
    });
    return row
      ? {
          status: row.Status,
          hasStartedExecution: row.Trip.some((trip) =>
            trip.TripExecution.some(
              (execution) =>
                execution.ActualPickupDateTime !== null ||
                execution.Status === "InProgress" ||
                execution.Status === "Completed",
            ),
          ),
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

  async createRoute(input: NewTripRoute) {
    const row = await this.client.route.create({
      data: {
        TripId: input.tripId,
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

export class PrismaTripRepository implements TripRepository {
  constructor(private readonly client: PrismaClient) {}

  async atomic<T>(work: (session: TripWriteSession) => Promise<T>) {
    return this.client.$transaction(
      async (transaction) => {
        const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`
          DECLARE @result int;
          EXEC @result = sys.sp_getapplock
            @Resource = N'FleetManagement.Trip.Write',
            @LockMode = 'Exclusive',
            @LockOwner = 'Transaction',
            @LockTimeout = 10000;
          SELECT @result AS result;
        `;
        if (!lock || lock.result < 0) {
          throw new Error("Trip write lock could not be acquired.");
        }
        return work(new PrismaTripWriteSession(transaction));
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 15_000,
        timeout: 30_000,
      },
    );
  }

  async list(search: string, status: string, page: number) {
    const contains = { contains: search };
    const searchWhere: Prisma.TripRequestWhereInput = search
      ? {
          OR: [
            { RequestNo: contains },
            { Purpose: contains },
            { Status: contains },
            { TripRequestType: { TypeName: contains } },
            {
              Trip: {
                some: {
                  OR: [
                    { People: { FirstName: contains } },
                    { People: { LastName: contains } },
                    {
                      Location_Trip_OriginLocationIdToLocation: {
                        LocationName: contains,
                      },
                    },
                    {
                      Location_Trip_DestinationLocationIdToLocation: {
                        LocationName: contains,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {};
    const where: Prisma.TripRequestWhereInput = {
      ...searchWhere,
      ...(status ? { Status: status } : {}),
    };

    const [rows, totalCount, statusRows] = await Promise.all([
      this.client.tripRequest.findMany({
        where,
        select: {
          TripRequestId: true,
          RequestNo: true,
          RequestDateTime: true,
          RequestedTravelDateTime: true,
          Purpose: true,
          Status: true,
          TripRequestType: { select: { TypeName: true } },
          Trip: {
            select: {
              Location_Trip_OriginLocationIdToLocation: {
                select: { LocationName: true },
              },
              Location_Trip_DestinationLocationIdToLocation: {
                select: { LocationName: true },
              },
            },
          },
          _count: { select: { Trip: true } },
        },
        orderBy: { TripRequestId: "desc" },
        skip: (page - 1) * 20,
        take: 20,
      }),
      this.client.tripRequest.count({ where }),
      this.client.tripRequest.groupBy({
        by: ["Status"],
        orderBy: { Status: "asc" },
      }),
    ]);

    return {
      requests: rows.map((row) => ({
        tripRequestId: row.TripRequestId,
        requestNo: row.RequestNo,
        requestTypeName: row.TripRequestType.TypeName,
        requestDateTime: row.RequestDateTime,
        requestedTravelDateTime: row.RequestedTravelDateTime,
        purpose: row.Purpose,
        status: row.Status,
        passengerCount: row._count.Trip,
        origins: [
          ...new Set(
            row.Trip.map(
              (trip) =>
                trip.Location_Trip_OriginLocationIdToLocation.LocationName,
            ),
          ),
        ],
        destinations: [
          ...new Set(
            row.Trip.map(
              (trip) =>
                trip.Location_Trip_DestinationLocationIdToLocation.LocationName,
            ),
          ),
        ],
      })),
      totalCount,
      statuses: [
        ...TRIP_REQUEST_STATUSES,
        ...statusRows
          .map((row) => row.Status)
          .filter(
            (value) =>
              !TRIP_REQUEST_STATUSES.includes(value as TripRequestStatus),
          ),
      ],
    };
  }

  async details(id: number): Promise<TripRequestDetails | null> {
    const row = await this.client.tripRequest.findUnique({
      where: { TripRequestId: id },
      select: {
        TripRequestId: true,
        RequestNo: true,
        RequestDateTime: true,
        RequestedTravelDateTime: true,
        Purpose: true,
        Status: true,
        Description: true,
        CreatedAt: true,
        TripRequestType: true,
        Trip: {
          select: tripSelect,
          orderBy: [
            { PickupOrder: "asc" },
            { DropoffOrder: "asc" },
            { TripId: "asc" },
          ],
        },
      },
    });
    if (!row) return null;

    const executions = row.Trip.flatMap((trip) => trip.TripExecution);
    const routes = row.Trip.flatMap((trip) => [
      ...trip.Route,
      ...trip.TripExecution.flatMap((execution) => execution.Route),
    ]);
    const decimals = await readDecimalMaps(this.client, routes, executions);

    return {
      tripRequestId: row.TripRequestId,
      requestNo: row.RequestNo,
      requestType: {
        tripRequestTypeId: row.TripRequestType.TripRequestTypeId,
        typeCode: row.TripRequestType.TypeCode,
        typeName: row.TripRequestType.TypeName,
        description: row.TripRequestType.Description,
      },
      requestDateTime: row.RequestDateTime,
      requestedTravelDateTime: row.RequestedTravelDateTime,
      purpose: row.Purpose,
      status: row.Status,
      description: row.Description,
      createdAt: row.CreatedAt,
      passengers: row.Trip.map((trip) =>
        mapTrip(trip, row.RequestedTravelDateTime, decimals),
      ),
    };
  }

  async requestTypes() {
    const rows = await this.client.tripRequestType.findMany({
      orderBy: { TripRequestTypeId: "asc" },
    });
    return rows.map((row) => ({
      tripRequestTypeId: row.TripRequestTypeId,
      typeCode: row.TypeCode,
      typeName: row.TypeName,
      description: row.Description,
    }));
  }

  async availablePeople() {
    const rows = await this.client.people.findMany({
      where: { IsActive: true },
      select: personSelect,
      orderBy: [{ LastName: "asc" }, { PersonId: "asc" }],
    });
    return rows.map(mapPerson);
  }

  async availableLocations() {
    const rows = await this.client.location.findMany({
      where: { OR: [{ IsActive: true }, { IsActive: null }] },
      select: locationSelect,
      orderBy: [{ LocationName: "asc" }, { LocationId: "asc" }],
    });
    return rows.map(mapLocation);
  }

  async assignmentsActiveAt(dateTime: Date) {
    const rows = await this.client.vehicleDriverAssignment.findMany({
      where: {
        FromDateTime: { lte: dateTime },
        OR: [{ ToDateTime: null }, { ToDateTime: { gt: dateTime } }],
      },
      select: assignmentSelect,
      orderBy: [{ FromDateTime: "desc" }, { AssignmentId: "desc" }],
    });
    return rows.map((row) => mapAssignment(row, dateTime));
  }
}
