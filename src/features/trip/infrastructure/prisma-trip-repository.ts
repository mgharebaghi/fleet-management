import {
  Prisma,
  type PrismaClient,
} from "../../../generated/prisma/client";
import type {
  TripRepository,
  TripWriteSession,
} from "../application/trip-repository";
import type { TripRequestDetails } from "../application/trip-records";
import {
  TRIP_REQUEST_STATUSES,
  type TripRequestStatus,
} from "../application/trip-lifecycle";
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
} from "./prisma-trip-mapping";
import { PrismaTripWriteSession } from "./prisma-trip-write-session";

export class PrismaTripRepository implements TripRepository {
  constructor(private readonly client: PrismaClient) {}

  async atomic<T>(
    work: (session: TripWriteSession) => Promise<T>,
    options?: { requestNoYear?: number },
  ) {
    return this.client.$transaction(
      async (transaction) => {
        if (options?.requestNoYear !== undefined) {
          const resource = `FleetManagement.Trip.RequestNo.${options.requestNoYear}`;
          const [lock] = await transaction.$queryRaw<
            Array<{ result: number }>
          >`
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock
              @Resource = ${resource},
              @LockMode = 'Exclusive',
              @LockOwner = 'Transaction',
              @LockTimeout = 10000;
            SELECT @result AS result;
          `;
          if (!lock || lock.result < 0) {
            throw new Error("Trip request-number lock could not be acquired.");
          }
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
