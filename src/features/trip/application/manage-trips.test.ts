import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ManageTrips } from "./manage-trips";
import type {
  TripRepository,
  TripWriteSession,
} from "./trip-repository";
import type {
  CreateCompleteTripRequestCommand,
  CreateTripRequestCommand,
  NewTripRoute,
  SaveTripExecutionInput,
  TripPassengerRecord,
} from "./trip-records";

const requestType = {
  tripRequestTypeId: 1,
  typeCode: "COMMON_ORIGIN",
  typeName: "مبدأ مشترک",
  description: null,
};
const person = {
  personId: 1,
  firstName: "Test",
  lastName: "Passenger",
  personnelNo: "P-1",
  nationalCode: null,
  mobile: null,
  isActive: true,
};
const location = {
  locationId: 1,
  locationCode: null,
  locationName: "تهران",
  locationType: null,
  address: null,
  isActive: true,
};
const vehicle = {
  vehicleId: 1,
  vehicleCode: "V-1",
  plateNoLeftSide: "12",
  plateNoCenterChar: "ب",
  plateNoRightSide: "345",
  plateNoIranNo: "67",
  brandName: "Brand",
  modelName: "Model",
  vehicleTypeName: null,
  vehicleStatusName: "Operational",
  isActive: true,
};
const assignment = {
  assignmentId: 1,
  fromDateTime: new Date("2026-01-01T00:00:00Z"),
  toDateTime: null,
  driverId: 1,
  driverFirstName: "Test",
  driverLastName: "Driver",
  driverPersonnelNo: "D-1",
  driverIsActive: true,
  hasEligibleLicense: true,
  vehicle,
};
const trip = {
  tripId: 1,
  passengerPersonId: 1,
  originLocationId: 1,
  destinationLocationId: 2,
  requestedPickupDateTime: new Date("2026-02-01T08:00:00Z"),
  requestedTravelDateTime: new Date("2026-02-01T08:00:00Z"),
  pickupOrder: 1,
  dropoffOrder: 1,
  status: null,
  description: null,
  passenger: person,
  origin: location,
  destination: { ...location, locationId: 2, locationName: "قم" },
  routes: [],
  executions: [],
  requestId: 1,
  requestStatus: "New",
} satisfies TripPassengerRecord & {
  requestedTravelDateTime: Date;
  requestId: number;
  requestStatus: string;
};

const session = {
  requestType: vi.fn(),
  requestLifecycle: vi.fn(),
  requestNumbers: vi.fn(),
  requestNoExists: vi.fn(),
  lockRequestNumberYear: vi.fn(),
  person: vi.fn(),
  location: vi.fn(),
  trip: vi.fn(),
  execution: vi.fn(),
  assignment: vi.fn(),
  activePassengerCountsByVehicle: vi.fn(),
  createRequest: vi.fn(),
  updateRequestStatus: vi.fn(),
  cancelPlannedExecutions: vi.fn(),
  startTripExecutions: vi.fn(),
  route: vi.fn(),
  createRoute: vi.fn(),
  updateRoute: vi.fn(),
  deleteRoute: vi.fn(),
  deselectOtherSelectedRoutes: vi.fn(),
  request: vi.fn(),
  createPassenger: vi.fn(),
  updatePassenger: vi.fn(),
  deletePassenger: vi.fn(),
  createExecution: vi.fn(),
  updateExecution: vi.fn(),
  updateSurvey: vi.fn(),
} satisfies TripWriteSession;

const repository = {
  atomic: async <T>(work: (value: TripWriteSession) => Promise<T>) =>
    work(session),
  list: vi.fn(),
  details: vi.fn(),
  requestTypes: vi.fn(),
  availablePeople: vi.fn(),
  availableLocations: vi.fn(),
  assignmentsActiveAt: vi.fn(),
  activePassengerCountsByVehicle: vi.fn(),
  countPendingRequests: vi.fn(),
} satisfies TripRepository;

const manage = new ManageTrips(repository);

const createInput: CreateTripRequestCommand = {
  tripRequestTypeId: 1,
  requestedTravelDateTime: new Date("2026-02-01T08:00:00Z"),
  purpose: " مأموریت ",
  description: " توضیح ",
  passengers: [
    {
      passengerPersonId: 1,
      originLocationId: 1,
      destinationLocationId: 2,
      requestedPickupDateTime: null,
      pickupOrder: 1,
      dropoffOrder: 1,
      status: null,
      description: null,
    },
  ],
};

const routeInput: NewTripRoute = {
  tripId: 1,
  tripExecutionId: null,
  routeName: " مسیر اصلی ",
  alternativeNo: 1,
  distanceKm: "120.25",
  estimatedDurationMinute: 90,
  isSelected: true,
  description: null,
  points: [
    {
      locationId: 1,
      sequenceNo: 1,
      trafficZone: null,
      distanceFromStartKm: "0",
      description: null,
    },
  ],
};

const plannedExecutionInput: SaveTripExecutionInput = {
  tripId: 1,
  tripExecutionId: null,
  vehicleDriverAssignmentId: 1,
  actualPickupDateTime: null,
  actualDropoffDateTime: null,
  startOdometer: null,
  endOdometer: null,
  status: " Planned ",
  description: null,
};

const startedExecutionInput: SaveTripExecutionInput = {
  tripId: 1,
  tripExecutionId: 2,
  vehicleDriverAssignmentId: 1,
  actualPickupDateTime: new Date("2026-02-01T08:00:00Z"),
  actualDropoffDateTime: null,
  startOdometer: "100",
  endOdometer: null,
  status: "InProgress",
  description: null,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));
  vi.resetAllMocks();
  session.requestType.mockResolvedValue(requestType);
  session.requestLifecycle.mockResolvedValue({
    status: "New",
    passengers: [
      {
        tripId: 1,
        executions: [],
      },
    ],
  });
  session.requestNumbers.mockResolvedValue([]);
  session.requestNoExists.mockResolvedValue(false);
  session.person.mockResolvedValue(person);
  session.location.mockImplementation(async (id) => ({
    ...location,
    locationId: id,
  }));
  session.trip.mockResolvedValue(trip);
  session.assignment.mockResolvedValue(assignment);
  session.activePassengerCountsByVehicle.mockResolvedValue({});
  session.execution.mockResolvedValue({
    tripExecutionId: 2,
    tripId: 1,
    status: "Planned",
    actualPickupDateTime: null,
    actualDropoffDateTime: null,
    vehicleDriverAssignmentId: 1,
    requestId: 1,
    requestStatus: "Assigned",
  });
  session.createRequest.mockResolvedValue({ tripRequestId: 10, tripIds: [101] });
  session.route.mockResolvedValue({
    routeId: 20,
    tripId: 1,
    tripExecutionId: null,
    isSelected: true,
  });
  session.createRoute.mockResolvedValue(20);
  session.updateRoute.mockResolvedValue(undefined);
  session.deleteRoute.mockResolvedValue(undefined);
  session.createExecution.mockResolvedValue(30);
  session.cancelPlannedExecutions.mockResolvedValue(undefined);
  session.startTripExecutions.mockResolvedValue(undefined);
  session.deselectOtherSelectedRoutes.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("create Trip request", () => {
  it("normalizes and creates a request with its passenger Trips atomically", async () => {
    expect(await manage.createRequest(createInput)).toEqual({
      success: true,
      id: 10,
    });
    expect(session.createRequest).toHaveBeenCalledWith({
      ...createInput,
      requestDateTime: new Date("2026-01-01T08:00:00Z"),
      requestNo: "TR-1404-0001",
      purpose: "مأموریت",
      status: "New",
      description: "توضیح",
      passengers: [
        {
          ...createInput.passengers[0],
          requestedPickupDateTime: createInput.requestedTravelDateTime,
        },
      ],
    });
  });

  it("persists the request travel datetime even when a passenger pickup override is supplied", async () => {
    const requestedPickupDateTime = new Date("2026-02-01T08:30:00Z");

    await manage.createRequest({
      ...createInput,
      passengers: [
        {
          ...createInput.passengers[0],
          requestedPickupDateTime,
        },
      ],
    });

    expect(session.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        passengers: [
          expect.objectContaining({
            requestedPickupDateTime: createInput.requestedTravelDateTime,
          }),
        ],
      }),
    );
  });

  it.each([
    [{ requestedTravelDateTime: new Date("invalid") }, "INVALID_DATE"],
    [{ purpose: "x".repeat(501) }, "PURPOSE_TOO_LONG"],
    [{ passengers: [] }, "PASSENGER_REQUIRED"],
  ] as const)("rejects invalid request input %o", async (change, error) => {
    expect(
      await manage.createRequest({
        ...createInput,
        ...(change as Partial<CreateTripRequestCommand>),
      }),
    ).toMatchObject({ success: false, error });
    expect(session.createRequest).not.toHaveBeenCalled();
  });

  it("enforces the seeded request-type grouping semantics", async () => {
    expect(
      await manage.createRequest({
        ...createInput,
        passengers: [
          createInput.passengers[0],
          {
            ...createInput.passengers[0],
            passengerPersonId: 2,
            originLocationId: 3,
          },
        ],
      }),
    ).toEqual({ success: false, error: "COMMON_ORIGIN_REQUIRED" });
  });

  it("increments normalized yearly RequestNo values and pre-checks duplicates", async () => {
    session.requestNumbers.mockResolvedValue([
      "tr-1404-0002",
      "TR-1404-0009",
    ]);
    expect(await manage.createRequest(createInput)).toEqual({
      success: true,
      id: 10,
    });
    expect(session.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestNo: "TR-1404-0010" }),
    );

    session.requestNoExists.mockResolvedValue(true);
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "REQUEST_NO_DUPLICATE",
    });
  });

  it("reports a full four-digit yearly sequence", async () => {
    session.requestNumbers.mockResolvedValue(["TR-1404-9999"]);
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "REQUEST_SEQUENCE_EXHAUSTED",
    });
  });

  it("rejects inactive people and locations", async () => {
    session.person.mockResolvedValueOnce({ ...person, isActive: false });
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "PERSON_INACTIVE",
    });

    session.location.mockResolvedValueOnce({ ...location, isActive: false });
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "LOCATION_INACTIVE",
      failedLocation: { passengerIndex: 0, locationRole: "origin" },
    });
  });

  it("identifies which passenger origin or destination failed Location lookup", async () => {
    session.location.mockImplementation(async (id: number) =>
      id === 1 ? null : { ...location, locationId: id },
    );
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "LOCATION_NOT_FOUND",
      failedLocation: { passengerIndex: 0, locationRole: "origin" },
    });

    session.location.mockImplementation(async (id: number) =>
      id === 2 ? null : { ...location, locationId: id },
    );
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "LOCATION_NOT_FOUND",
      failedLocation: { passengerIndex: 0, locationRole: "destination" },
    });

    session.location.mockImplementation(async (id: number) => ({
      ...location,
      locationId: id,
      isActive: id !== 1,
    }));
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "LOCATION_INACTIVE",
      failedLocation: { passengerIndex: 0, locationRole: "origin" },
    });

    session.location.mockImplementation(async (id: number) => ({
      ...location,
      locationId: id,
      isActive: id !== 2,
    }));
    expect(await manage.createRequest(createInput)).toEqual({
      success: false,
      error: "LOCATION_INACTIVE",
      failedLocation: { passengerIndex: 0, locationRole: "destination" },
    });

    session.location.mockImplementation(async (id: number) =>
      id === 3 ? null : { ...location, locationId: id },
    );
    expect(
      await manage.createRequest({
        ...createInput,
        passengers: [
          createInput.passengers[0],
          {
            ...createInput.passengers[0],
            passengerPersonId: 2,
            destinationLocationId: 3,
          },
        ],
      }),
    ).toEqual({
      success: false,
      error: "LOCATION_NOT_FOUND",
      failedLocation: { passengerIndex: 1, locationRole: "destination" },
    });
  });
});

describe("create complete Trip request", () => {
  const completeInput: CreateCompleteTripRequestCommand = {
    ...createInput,
    passengers: [
      {
        ...createInput.passengers[0],
        vehicleDriverAssignmentId: 11,
        routes: [
          {
            routeName: "مسیر اصلی",
            alternativeNo: null,
            distanceKm: "12.50",
            estimatedDurationMinute: 30,
            isSelected: true,
            description: null,
            points: [
              {
                locationId: 3,
                trafficZone: null,
                sequenceNo: 1,
                distanceFromStartKm: "5.00",
                description: null,
              },
            ],
          },
        ],
      },
      {
        ...createInput.passengers[0],
        passengerPersonId: 2,
        destinationLocationId: 4,
        pickupOrder: 2,
        dropoffOrder: 2,
        vehicleDriverAssignmentId: 22,
        routes: [
          {
            routeName: "مسیر دوم",
            alternativeNo: 2,
            distanceKm: null,
            estimatedDurationMinute: null,
            isSelected: false,
            description: "مسیر مسافر دوم",
            points: [],
          },
        ],
      },
    ],
  };

  it("maps generated Trip ids to each passenger's assignment and optional routes in one atomic callback", async () => {
    session.createRequest.mockResolvedValueOnce({
      tripRequestId: 77,
      tripIds: [701, 702],
    });

    expect(await manage.createCompleteRequest(completeInput)).toEqual({
      success: true,
      id: 77,
    });

    expect(session.lockRequestNumberYear).toHaveBeenCalledWith(1404);
    expect(session.createRequest).toHaveBeenCalledTimes(1);
    expect(session.createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestDateTime: new Date("2026-01-01T08:00:00Z"),
        requestNo: "TR-1404-0001",
        status: "New",
        passengers: [
          expect.objectContaining({ passengerPersonId: 1 }),
          expect.objectContaining({ passengerPersonId: 2 }),
        ],
      }),
    );
    expect(session.createExecution).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tripId: 701, vehicleDriverAssignmentId: 11, status: "Planned" }),
    );
    expect(session.createExecution).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tripId: 702, vehicleDriverAssignmentId: 22, status: "Planned" }),
    );
    expect(session.createRoute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ tripId: 701, routeName: "مسیر اصلی", points: [expect.objectContaining({ locationId: 3 })] }),
    );
    expect(session.createRoute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tripId: 702, routeName: "مسیر دوم", points: [] }),
    );
    expect(session.updateRequestStatus).toHaveBeenCalledWith(77, "Assigned");
  });

  it("validates the complete command before creating any request rows", async () => {
    const result = await manage.createCompleteRequest({
      ...completeInput,
      passengers: [
        {
          ...completeInput.passengers[0],
          vehicleDriverAssignmentId: Number.NaN,
        },
      ],
    });

    expect(result).toMatchObject({ success: false, error: "INVALID_ID" });
    expect(session.createRequest).not.toHaveBeenCalled();
  });

  it("does not attempt to persist blank route points", async () => {
    session.createRequest.mockResolvedValueOnce({ tripRequestId: 88, tripIds: [801] });
    await manage.createCompleteRequest({
      ...completeInput,
      passengers: [{ ...completeInput.passengers[1], passengerPersonId: 1 }],
    });
    expect(session.createRoute).toHaveBeenCalledWith(
      expect.objectContaining({ points: [] }),
    );
  });
});

describe("Trip request status", () => {
  it("requires a persisted plan before Assigned and cancels Planned children", async () => {
    expect(await manage.changeRequestStatus(1, "Assigned")).toEqual({
      success: false,
      error: "PLANNING_REQUIRED",
    });

    session.requestLifecycle.mockResolvedValue({
      status: "New",
      passengers: [
        {
          tripId: 1,
          executions: [
            {
              tripExecutionId: 2,
              status: "Planned",
              actualPickupDateTime: null,
            },
          ],
        },
      ],
    });
    expect(await manage.changeRequestStatus(1, "Assigned")).toEqual({
      success: true,
      id: 1,
    });
    expect(session.updateRequestStatus).toHaveBeenCalledWith(1, "Assigned");

    expect(await manage.changeRequestStatus(1, "Cancelled")).toEqual({
      success: true,
      id: 1,
    });
    expect(session.cancelPlannedExecutions).toHaveBeenCalledWith(1);
  });

  it("rejects reverse, unknown, incomplete and post-start cancellation", async () => {
    session.requestLifecycle.mockResolvedValue({
      status: "Assigned",
      passengers: [
        {
          tripId: 1,
          executions: [
            {
              tripExecutionId: 2,
              status: "Planned",
              actualPickupDateTime: null,
            },
          ],
        },
      ],
    });
    expect(await manage.changeRequestStatus(1, "New")).toEqual({
      success: false,
      error: "INVALID_REQUEST_TRANSITION",
    });
    expect(await manage.changeRequestStatus(1, "مبهم")).toEqual({
      success: false,
      error: "INVALID_REQUEST_STATUS",
    });
    expect(await manage.changeRequestStatus(1, "InProgress")).toEqual({
      success: true,
      id: 1,
    });
    expect(session.startTripExecutions).toHaveBeenCalledWith(1);
    expect(session.updateRequestStatus).toHaveBeenCalledWith(1, "InProgress");

    session.requestLifecycle.mockResolvedValue({
      status: "Assigned",
      passengers: [
        {
          tripId: 1,
          executions: [],
        },
      ],
    });
    expect(await manage.changeRequestStatus(1, "InProgress")).toEqual({
      success: false,
      error: "PLANNING_REQUIRED",
    });
    session.requestLifecycle.mockResolvedValue({
      status: "Assigned",
      passengers: [
        {
          tripId: 1,
          executions: [
            {
              tripExecutionId: 2,
              status: "InProgress",
              actualPickupDateTime: new Date("2026-02-01T08:00:00Z"),
            },
          ],
        },
      ],
    });
    expect(await manage.changeRequestStatus(1, "Cancelled")).toEqual({
      success: false,
      error: "INVALID_REQUEST_TRANSITION",
    });
  });
});

describe("planned routes", () => {
  it("creates a Trip-owned route with ordered location points", async () => {
    expect(await manage.addRoute(routeInput)).toEqual({
      success: true,
      id: 20,
    });
    expect(session.createRoute).toHaveBeenCalledWith({
      ...routeInput,
      routeName: "مسیر اصلی",
    });
    expect(session.deselectOtherSelectedRoutes).toHaveBeenCalledWith({
      tripId: 1,
      tripExecutionId: null,
    });
  });

  it.each([
    [{ routeName: " " }, "ROUTE_NAME_REQUIRED"],
    [{ alternativeNo: 0 }, "INVALID_ROUTE_NUMBER"],
    [{ distanceKm: "-1" }, "INVALID_DISTANCE"],
    [{ distanceKm: "100000000" }, "INVALID_DISTANCE"],
    [{ estimatedDurationMinute: -1 }, "INVALID_DURATION"],
    [
      { points: [{ ...routeInput.points[0], sequenceNo: 0 }] },
      "INVALID_SEQUENCE",
    ],
  ] as const)("mirrors Route CHECK constraints for %o", async (change, error) => {
    expect(
      await manage.addRoute({
        ...routeInput,
        ...(change as Partial<NewTripRoute>),
      }),
    ).toEqual({ success: false, error });
  });

  it("updates an existing route without creating a duplicate Route row", async () => {
    const updateInput = {
      ...routeInput,
      routeId: 20,
      points: [
        ...routeInput.points,
        {
          locationId: 2,
          sequenceNo: 2,
          trafficZone: null,
          distanceFromStartKm: "10.5",
          description: "نقطه جدید اضافه شده",
        },
      ],
    };

    const result = await manage.saveRoute(updateInput);

    expect(result).toEqual({
      success: true,
      id: 20,
    });
    // Verifies that createRoute was NOT called
    expect(session.createRoute).not.toHaveBeenCalled();
    // Verifies updateRoute was called with the exact same routeId and new points
    expect(session.updateRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        routeId: 20,
        tripId: 1,
        points: expect.arrayContaining([
          expect.objectContaining({ locationId: 1 }),
          expect.objectContaining({ locationId: 2 }),
        ]),
      }),
    );
  });

  it("rejects updating a route belonging to another passenger (multi-passenger isolation)", async () => {
    session.route.mockResolvedValueOnce({
      routeId: 20,
      tripId: 2, // Belongs to passenger 2
      tripExecutionId: null,
      isSelected: false,
    });

    const result = await manage.saveRoute({
      ...routeInput,
      routeId: 20,
      tripId: 1, // Target is passenger 1
    });

    expect(result).toEqual({ success: false, error: "TRIP_NOT_FOUND" });
    expect(session.updateRoute).not.toHaveBeenCalled();
  });

  it("rejects updating a route in a terminal TripRequest", async () => {
    session.trip.mockResolvedValueOnce({
      ...trip,
      requestStatus: "Completed",
    });

    const result = await manage.saveRoute({
      ...routeInput,
      routeId: 20,
    });

    expect(result).toEqual({ success: false, error: "REQUEST_TERMINAL" });
    expect(session.updateRoute).not.toHaveBeenCalled();
  });

  it("deletes a route and its points transactionally", async () => {
    const result = await manage.deleteRoute({
      tripRequestId: 1,
      routeId: 20,
    });

    expect(result).toEqual({ success: true, id: 20 });
    expect(session.deleteRoute).toHaveBeenCalledWith(20);
  });

  it("rejects deleting a route in a terminal TripRequest", async () => {
    session.trip.mockResolvedValueOnce({
      ...trip,
      requestStatus: "Cancelled",
    });

    const result = await manage.deleteRoute({
      tripRequestId: 1,
      routeId: 20,
    });

    expect(result).toEqual({ success: false, error: "REQUEST_TERMINAL" });
    expect(session.deleteRoute).not.toHaveBeenCalled();
  });

  it("protects historical execution evidence from route deletion", async () => {
    session.route.mockResolvedValueOnce({
      routeId: 20,
      tripId: 1,
      tripExecutionId: 5, // Attached to an execution
      isSelected: true,
    });

    const result = await manage.deleteRoute({
      tripRequestId: 1,
      routeId: 20,
    });

    expect(result).toEqual({ success: false, error: "ROUTE_IN_USE" });
    expect(session.deleteRoute).not.toHaveBeenCalled();
  });

  it("returns ROUTE_NOT_FOUND when trying to delete a non-existent route", async () => {
    session.route.mockResolvedValueOnce(null);

    const result = await manage.deleteRoute({
      tripRequestId: 1,
      routeId: 999,
    });

    expect(result).toEqual({ success: false, error: "ROUTE_NOT_FOUND" });
    expect(session.deleteRoute).not.toHaveBeenCalled();
  });
});

describe("Trip execution and survey", () => {
  it("creates a Planned execution against an assignment active at scheduled pickup", async () => {
    expect(await manage.saveExecution(plannedExecutionInput)).toEqual({
      success: true,
      id: 30,
    });
    expect(session.createExecution).toHaveBeenCalledWith({
      ...plannedExecutionInput,
      status: "Planned",
    });
  });

  it("rejects actual start data on a Planned or Cancelled execution", async () => {
    expect(
      await manage.saveExecution({
        ...plannedExecutionInput,
        actualPickupDateTime: startedExecutionInput.actualPickupDateTime,
      }),
    ).toEqual({ success: false, error: "UNEXPECTED_ACTUAL_START" });
  });

  it("allows InProgress execution with optional actualPickupDateTime and forbids dropoff while InProgress", async () => {
    // Actual pickup is optional during InProgress (can remain null)
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        actualPickupDateTime: null,
      }),
    ).toEqual({ success: true, id: 2 });

    // Dropoff cannot be entered while execution status is InProgress
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
      }),
    ).toEqual({ success: false, error: "UNEXPECTED_ACTUAL_DROPOFF" });
  });

  it("requires actualDropoffDateTime to complete passenger execution, while actualPickupDateTime remains optional", async () => {
    // Cannot complete without dropoff
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        status: "Completed",
        actualDropoffDateTime: null,
      }),
    ).toEqual({ success: false, error: "MISSING_ACTUAL_DROPOFF" });

    // Can complete with dropoff even when pickup is null
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        status: "Completed",
        actualPickupDateTime: null,
        actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
      }),
    ).toEqual({ success: true, id: 2 });
    expect(session.updateExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        tripExecutionId: 2,
        status: "Completed",
        actualPickupDateTime: null,
        actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
      }),
    );
  });

  it("allows entering or editing ActualPickupDateTime later on the same TripExecution", async () => {
    session.execution.mockResolvedValue({
      tripExecutionId: 2,
      tripId: 1,
      status: "InProgress",
      actualPickupDateTime: null,
      actualDropoffDateTime: null,
      vehicleDriverAssignmentId: 1,
      requestId: 1,
      requestStatus: "InProgress",
    });

    const laterPickup = new Date("2026-02-01T08:15:00Z");
    const result = await manage.saveExecution({
      ...startedExecutionInput,
      actualPickupDateTime: laterPickup,
    });
    expect(result).toEqual({ success: true, id: 2 });
    expect(session.updateExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        tripExecutionId: 2,
        actualPickupDateTime: laterPickup,
      }),
    );
  });

  it("updates only an execution belonging to the selected Trip", async () => {
    expect(await manage.saveExecution(startedExecutionInput)).toEqual({
      success: true,
      id: 2,
    });
    expect(session.updateExecution).toHaveBeenCalled();

    session.execution.mockResolvedValue({
      tripExecutionId: 2,
      tripId: 9,
      status: "Planned",
      actualPickupDateTime: null,
      actualDropoffDateTime: null,
      vehicleDriverAssignmentId: 1,
      requestId: 1,
      requestStatus: "Assigned",
    });
    expect(await manage.saveExecution(startedExecutionInput)).toEqual({
      success: false,
      error: "EXECUTION_NOT_FOUND",
    });
  });

  it("forbids a second non-terminal execution on the same Trip", async () => {
    session.trip.mockResolvedValue({
      ...trip,
      executions: [
        {
          tripExecutionId: 9,
          tripId: 1,
          assignment,
          actualPickupDateTime: null,
          actualDropoffDateTime: null,
          startOdometer: null,
          endOdometer: null,
          status: "Planned",
          passengerRating: null,
          passengerComment: null,
          surveyDateTime: null,
          description: null,
          createdAt: null,
          routes: [],
        },
      ],
    });
    expect(await manage.saveExecution(plannedExecutionInput)).toEqual({
      success: false,
      error: "ACTIVE_EXECUTION_EXISTS",
    });
  });

  it("keeps the assignment immutable after actual start", async () => {
    session.execution.mockResolvedValue({
      tripExecutionId: 2,
      tripId: 1,
      status: "InProgress",
      actualPickupDateTime: startedExecutionInput.actualPickupDateTime,
      actualDropoffDateTime: null,
      vehicleDriverAssignmentId: 1,
      requestId: 1,
      requestStatus: "InProgress",
    });
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        vehicleDriverAssignmentId: 99,
      }),
    ).toEqual({ success: false, error: "ASSIGNMENT_IMMUTABLE" });
  });

  it.each([
    [
      {
        ...startedExecutionInput,
        actualDropoffDateTime: new Date("2026-02-01T07:59:00Z"),
      },
      "INVALID_EXECUTION_PERIOD",
    ],
    [{ ...startedExecutionInput, startOdometer: "-1" }, "INVALID_ODOMETER"],
    [
      {
        ...startedExecutionInput,
        endOdometer: "99.99",
      },
      "ODOMETER_DECREASE",
    ],
    [
      {
        ...startedExecutionInput,
        startOdometer: null,
        endOdometer: "10",
      },
      "MISSING_START_ODOMETER",
    ],
  ] as const)("rejects invalid reconciliation %o", async (input, error) => {
    expect(await manage.saveExecution(input)).toEqual({
      success: false,
      error,
    });
  });

  it("rejects assignments outside the scheduled half-open period", async () => {
    session.assignment.mockResolvedValue({
      ...assignment,
      toDateTime: trip.requestedPickupDateTime,
    });
    expect(await manage.saveExecution(plannedExecutionInput)).toEqual({
      success: false,
      error: "ASSIGNMENT_NOT_ACTIVE",
    });
  });

  it("rejects inactive drivers, vehicles and ineligible licenses", async () => {
    session.assignment.mockResolvedValue({
      ...assignment,
      driverIsActive: false,
    });
    expect(await manage.saveExecution(plannedExecutionInput)).toEqual({
      success: false,
      error: "DRIVER_INACTIVE",
    });
    session.assignment.mockResolvedValue({
      ...assignment,
      vehicle: { ...assignment.vehicle, isActive: false },
    });
    expect(await manage.saveExecution(plannedExecutionInput)).toEqual({
      success: false,
      error: "VEHICLE_INACTIVE",
    });
    session.assignment.mockResolvedValue({
      ...assignment,
      hasEligibleLicense: false,
    });
    expect(await manage.saveExecution(plannedExecutionInput)).toEqual({
      success: false,
      error: "NO_ELIGIBLE_LICENSE",
    });
  });

  it("rejects reverse execution status and cancellation after actual start", async () => {
    session.execution.mockResolvedValue({
      tripExecutionId: 2,
      tripId: 1,
      status: "InProgress",
      actualPickupDateTime: startedExecutionInput.actualPickupDateTime,
      actualDropoffDateTime: null,
      vehicleDriverAssignmentId: 1,
      requestId: 1,
      requestStatus: "InProgress",
    });
    expect(
      await manage.saveExecution({
        ...plannedExecutionInput,
        tripExecutionId: 2,
        status: "Planned",
      }),
    ).toEqual({
      success: false,
      error: "INVALID_EXECUTION_TRANSITION",
    });
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        status: "Cancelled",
      }),
    ).toEqual({
      success: false,
      error: "UNEXPECTED_ACTUAL_START",
    });
  });

  it("rejects an unknown status when editing an execution", async () => {
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        status: "Unknown",
      }),
    ).toEqual({
      success: false,
      error: "INVALID_EXECUTION_STATUS",
    });
  });

  it("stores one survey payload only on a completed execution", async () => {
    session.execution.mockResolvedValue({
      tripExecutionId: 2,
      tripId: 1,
      status: "Completed",
      actualPickupDateTime: startedExecutionInput.actualPickupDateTime,
      actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
      vehicleDriverAssignmentId: 1,
      requestId: 1,
      requestStatus: "Completed",
    });
    expect(
      await manage.saveSurvey({
        tripExecutionId: 2,
        passengerRating: 5,
        passengerComment: " خوب ",
        surveyDateTime: new Date("2026-02-02T08:00:00Z"),
      }),
    ).toEqual({ success: true, id: 2 });
    expect(session.updateSurvey).toHaveBeenCalledWith({
      tripExecutionId: 2,
      passengerRating: 5,
      passengerComment: "خوب",
      surveyDateTime: new Date("2026-02-02T08:00:00Z"),
    });

    session.execution.mockResolvedValue({
      tripExecutionId: 2,
      tripId: 1,
      status: "InProgress",
      actualPickupDateTime: startedExecutionInput.actualPickupDateTime,
      actualDropoffDateTime: null,
      vehicleDriverAssignmentId: 1,
      requestId: 1,
      requestStatus: "InProgress",
    });
    expect(
      await manage.saveSurvey({
        tripExecutionId: 2,
        passengerRating: 5,
        passengerComment: "خوب",
        surveyDateTime: new Date("2026-02-02T08:00:00Z"),
      }),
    ).toEqual({ success: false, error: "SURVEY_NOT_ALLOWED" });
  });

  describe("passenger management", () => {
    const validPassengerInput = {
      passengerPersonId: 2,
      originLocationId: 1,
      destinationLocationId: 2,
      requestedPickupDateTime: new Date("2026-02-01T08:30:00Z"),
      pickupOrder: 2,
      dropoffOrder: 2,
      status: null,
      description: "همکار بخش فنی",
    };

    const mockRequest = {
      tripRequestId: 10,
      status: "Assigned",
      tripRequestTypeId: 1, // COMMON_ORIGIN
      passengers: [
        {
          tripId: 101,
          passengerPersonId: 1,
          originLocationId: 1,
          destinationLocationId: 2,
        },
      ],
    };

    beforeEach(() => {
      session.request.mockResolvedValue(mockRequest);
      session.requestType.mockResolvedValue(requestType);
      session.person.mockImplementation(async (id: number) => ({
        ...person,
        personId: id,
      }));
      session.location.mockImplementation(async (id: number) => ({
        ...location,
        locationId: id,
      }));
      session.createPassenger.mockResolvedValue(102);
      session.updatePassenger.mockResolvedValue(undefined);
      session.deletePassenger.mockResolvedValue(undefined);
    });

    it("adds a passenger to an existing non-terminal request", async () => {
      const result = await manage.addPassenger({
        tripRequestId: 10,
        passenger: validPassengerInput,
      });

      expect(result).toEqual({ success: true, id: 102 });
      expect(session.createPassenger).toHaveBeenCalledWith({
        tripRequestId: 10,
        passenger: expect.objectContaining({
          passengerPersonId: 2,
          originLocationId: 1,
          destinationLocationId: 2,
          description: "همکار بخش فنی",
        }),
      });
    });

    it("rejects adding a passenger to a completed or cancelled request", async () => {
      session.request.mockResolvedValue({
        ...mockRequest,
        status: "Completed",
      });

      const result = await manage.addPassenger({
        tripRequestId: 10,
        passenger: validPassengerInput,
      });

      expect(result).toEqual({ success: false, error: "REQUEST_TERMINAL" });
      expect(session.createPassenger).not.toHaveBeenCalled();
    });

    it("validates request type grouping when adding a passenger (e.g. Common Origin)", async () => {
      const invalidGroupingInput = {
        ...validPassengerInput,
        originLocationId: 99, // different origin violates COMMON_ORIGIN
      };

      const result = await manage.addPassenger({
        tripRequestId: 10,
        passenger: invalidGroupingInput,
      });

      expect(result).toEqual({
        success: false,
        error: "COMMON_ORIGIN_REQUIRED",
      });
      expect(session.createPassenger).not.toHaveBeenCalled();
    });

    it("updates a passenger when no execution has started", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        tripId: 101,
        requestId: 10,
        requestStatus: "Assigned",
        executions: [
          {
            tripExecutionId: 201,
            tripId: 101,
            status: "Planned",
            actualPickupDateTime: null,
            actualDropoffDateTime: null,
            startOdometer: null,
            endOdometer: null,
            description: null,
            passengerRating: null,
            passengerComment: null,
            surveyDateTime: null,
            assignment,
            routes: [],
          },
        ],
      });

      const result = await manage.updatePassenger({
        tripRequestId: 10,
        tripId: 101,
        passenger: {
          ...validPassengerInput,
          description: "ویرایش توضیحات",
        },
      });

      expect(result).toEqual({ success: true, id: 101 });
      expect(session.updatePassenger).toHaveBeenCalledWith({
        tripId: 101,
        passenger: expect.objectContaining({
          description: "ویرایش توضیحات",
        }),
      });
    });

    it("rejects updating passenger identity/route if execution has already started", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        tripId: 101,
        passengerPersonId: 1,
        originLocationId: 1,
        destinationLocationId: 2,
        requestId: 10,
        requestStatus: "InProgress",
        executions: [
          {
            tripExecutionId: 201,
            tripId: 101,
            status: "InProgress",
            actualPickupDateTime: new Date("2026-02-01T08:05:00Z"),
            actualDropoffDateTime: null,
            startOdometer: 1000,
            endOdometer: null,
            description: null,
            passengerRating: null,
            passengerComment: null,
            surveyDateTime: null,
            assignment,
            routes: [],
          },
        ],
      });

      // Attempt to change person
      const result = await manage.updatePassenger({
        tripRequestId: 10,
        tripId: 101,
        passenger: {
          ...validPassengerInput,
          passengerPersonId: 99, // changed person
        },
      });

      expect(result).toEqual({ success: false, error: "PASSENGER_IN_USE" });
      expect(session.updatePassenger).not.toHaveBeenCalled();
    });

    it("allows updating minor details (description, pickup time) even if execution started", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        tripId: 101,
        passengerPersonId: 1,
        originLocationId: 1,
        destinationLocationId: 2,
        requestId: 10,
        requestStatus: "InProgress",
        executions: [
          {
            tripExecutionId: 201,
            tripId: 101,
            status: "InProgress",
            actualPickupDateTime: new Date("2026-02-01T08:05:00Z"),
            actualDropoffDateTime: null,
            startOdometer: 1000,
            endOdometer: null,
            description: null,
            passengerRating: null,
            passengerComment: null,
            surveyDateTime: null,
            assignment,
            routes: [],
          },
        ],
      });

      const result = await manage.updatePassenger({
        tripRequestId: 10,
        tripId: 101,
        passenger: {
          passengerPersonId: 1,
          originLocationId: 1,
          destinationLocationId: 2,
          requestedPickupDateTime: new Date("2026-02-01T08:45:00Z"),
          pickupOrder: 1,
          dropoffOrder: 1,
          status: null,
          description: "یادداشت جدید در حین سفر",
        },
      });

      expect(result).toEqual({ success: true, id: 101 });
      expect(session.updatePassenger).toHaveBeenCalled();
    });

    it("deletes an unstarted passenger from a non-terminal request", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        tripId: 101,
        requestId: 10,
        requestStatus: "Assigned",
        routes: [],
        executions: [
          {
            tripExecutionId: 201,
            tripId: 101,
            status: "Planned",
            actualPickupDateTime: null,
            actualDropoffDateTime: null,
            startOdometer: null,
            endOdometer: null,
            description: null,
            passengerRating: null,
            passengerComment: null,
            surveyDateTime: null,
            assignment,
            routes: [],
          },
        ],
      });

      const result = await manage.deletePassenger({
        tripRequestId: 10,
        tripId: 101,
      });

      expect(result).toEqual({ success: true, id: 101 });
      expect(session.deletePassenger).toHaveBeenCalledWith(101);
    });

    it("rejects deleting a passenger if request is terminal", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        tripId: 101,
        requestId: 10,
        requestStatus: "Completed",
      });

      const result = await manage.deletePassenger({
        tripRequestId: 10,
        tripId: 101,
      });

      expect(result).toEqual({ success: false, error: "REQUEST_TERMINAL" });
      expect(session.deletePassenger).not.toHaveBeenCalled();
    });

    it("rejects deleting a passenger if execution has already started", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        tripId: 101,
        requestId: 10,
        requestStatus: "InProgress",
        executions: [
          {
            tripExecutionId: 201,
            tripId: 101,
            status: "InProgress",
            actualPickupDateTime: new Date("2026-02-01T08:05:00Z"),
            actualDropoffDateTime: null,
            startOdometer: 1000,
            endOdometer: null,
            description: null,
            passengerRating: null,
            passengerComment: null,
            surveyDateTime: null,
            assignment,
            routes: [],
          },
        ],
      });

      const result = await manage.deletePassenger({
        tripRequestId: 10,
        tripId: 101,
      });

      expect(result).toEqual({ success: false, error: "PASSENGER_IN_USE" });
      expect(session.deletePassenger).not.toHaveBeenCalled();
    });

    it("rejects adding a passenger when trip request is InProgress (planning freeze)", async () => {
      session.request.mockResolvedValue({
        tripRequestId: 10,
        status: "InProgress",
        tripRequestTypeId: 1,
        passengers: [],
      });

      const result = await manage.addPassenger({
        tripRequestId: 10,
        passenger: validPassengerInput,
      });

      expect(result).toEqual({ success: false, error: "REQUEST_TERMINAL" });
      expect(session.createPassenger).not.toHaveBeenCalled();
    });

    it("rejects adding or deleting planned routes when trip request is InProgress", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        requestId: 10,
        requestStatus: "InProgress",
      });

      const addRouteResult = await manage.saveRoute({
        tripId: 1,
        tripExecutionId: null,
        routeName: "مسیر اصلی",
        alternativeNo: null,
        distanceKm: "10",
        estimatedDurationMinute: 20,
        isSelected: true,
        description: null,
        points: [{ locationId: 1, trafficZone: null, sequenceNo: 1, distanceFromStartKm: null, description: null }],
      });
      expect(addRouteResult).toEqual({ success: false, error: "REQUEST_TERMINAL" });

      session.route.mockResolvedValue({
        routeId: 5,
        tripId: 1,
        tripExecutionId: null,
        routeName: "مسیر",
        alternativeNo: null,
        distanceKm: null,
        estimatedDurationMinute: null,
        isSelected: false,
        description: null,
        createdAt: new Date(),
        points: [],
      });

      const deleteRouteResult = await manage.deleteRoute({
        tripRequestId: 10,
        routeId: 5,
      });
      expect(deleteRouteResult).toEqual({ success: false, error: "REQUEST_TERMINAL" });
    });

    it("rejects adding a new planning execution when trip request is InProgress", async () => {
      session.trip.mockResolvedValue({
        ...trip,
        requestId: 10,
        requestStatus: "InProgress",
        executions: [],
      });

      const result = await manage.saveExecution({
        tripId: 1,
        tripExecutionId: null,
        vehicleDriverAssignmentId: 1,
        actualPickupDateTime: null,
        actualDropoffDateTime: null,
        startOdometer: null,
        endOdometer: null,
        status: "Planned",
        description: null,
      });

      expect(result).toEqual({ success: false, error: "REQUEST_TERMINAL" });
    });

    it("populates server timestamp on first survey save and preserves existing timestamp on subsequent edits", async () => {
      // First save: execution.surveyDateTime is null
      session.execution.mockResolvedValue({
        tripExecutionId: 2,
        tripId: 1,
        status: "Completed",
        actualPickupDateTime: new Date("2026-02-01T08:00:00Z"),
        actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
        vehicleDriverAssignmentId: 1,
        surveyDateTime: null,
        requestId: 1,
        requestStatus: "Completed",
      });

      const firstSave = await manage.saveSurvey({
        tripExecutionId: 2,
        passengerRating: 4,
        passengerComment: "خوب بود",
      });
      expect(firstSave).toEqual({ success: true, id: 2 });
      expect(session.updateSurvey).toHaveBeenCalledWith(
        expect.objectContaining({
          tripExecutionId: 2,
          passengerRating: 4,
          passengerComment: "خوب بود",
          surveyDateTime: expect.any(Date),
        }),
      );

      // Subsequent edit: execution.surveyDateTime already exists
      const originalTimestamp = new Date("2026-02-02T12:00:00Z");
      session.execution.mockResolvedValue({
        tripExecutionId: 2,
        tripId: 1,
        status: "Completed",
        actualPickupDateTime: new Date("2026-02-01T08:00:00Z"),
        actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
        vehicleDriverAssignmentId: 1,
        surveyDateTime: originalTimestamp,
        requestId: 1,
        requestStatus: "Completed",
      });

      const secondSave = await manage.saveSurvey({
        tripExecutionId: 2,
        passengerRating: 5,
        passengerComment: "عالی شد",
      });
      expect(secondSave).toEqual({ success: true, id: 2 });
      expect(session.updateSurvey).toHaveBeenCalledWith({
        tripExecutionId: 2,
        passengerRating: 5,
        passengerComment: "عالی شد",
        surveyDateTime: originalTimestamp,
      });
    });
  });

  describe("assignInitialRequest", () => {
    it("rejects invalid request identity or empty passenger assignments", async () => {
      expect(
        await manage.assignInitialRequest({
          tripRequestId: 0,
          passengers: [{ tripId: 1, vehicleDriverAssignmentId: 1 }],
        }),
      ).toEqual({ success: false, error: "INVALID_ID" });

      expect(
        await manage.assignInitialRequest({
          tripRequestId: 1,
          passengers: [],
        }),
      ).toEqual({ success: false, error: "PASSENGER_REQUIRED" });
    });

    it("rejects when request is not found or is not in New status", async () => {
      session.request.mockResolvedValue(null);
      expect(
        await manage.assignInitialRequest({
          tripRequestId: 1,
          passengers: [{ tripId: 1, vehicleDriverAssignmentId: 1 }],
        }),
      ).toEqual({ success: false, error: "REQUEST_NOT_FOUND" });

      session.request.mockResolvedValue({
        tripRequestId: 1,
        status: "Assigned",
        tripRequestTypeId: 1,
        passengers: [{ tripId: 1 }],
      });
      expect(
        await manage.assignInitialRequest({
          tripRequestId: 1,
          passengers: [{ tripId: 1, vehicleDriverAssignmentId: 1 }],
        }),
      ).toEqual({ success: false, error: "INVALID_REQUEST_TRANSITION" });
    });

    it("atomically creates planned executions, routes, and updates request status to Assigned", async () => {
      session.request.mockResolvedValue({
        tripRequestId: 1,
        status: "New",
        tripRequestTypeId: 1,
        passengers: [{ tripId: 1 }],
      });
      session.trip.mockResolvedValue(trip);
      session.assignment.mockResolvedValue(assignment);

      const result = await manage.assignInitialRequest({
        tripRequestId: 1,
        passengers: [
          {
            tripId: 1,
            vehicleDriverAssignmentId: 1,
            routes: [
              {
                routeName: "مسیر اصلی",
                alternativeNo: 1,
                distanceKm: "12",
                estimatedDurationMinute: 20,
                isSelected: true,
                description: null,
                points: [{ locationId: 1, trafficZone: null, sequenceNo: 1, distanceFromStartKm: null, description: null }],
              },
            ],
          },
        ],
      });

      expect(result).toEqual({ success: true, id: 1 });
      expect(session.createExecution).toHaveBeenCalledWith({
        tripId: 1,
        tripExecutionId: null,
        vehicleDriverAssignmentId: 1,
        actualPickupDateTime: null,
        actualDropoffDateTime: null,
        startOdometer: null,
        endOdometer: null,
        status: "Planned",
        description: null,
      });
      expect(session.updateRequestStatus).toHaveBeenCalledWith(1, "Assigned");
    });

    function requestFor(tripIds: number[]) {
      session.request.mockResolvedValue({
        tripRequestId: 1,
        status: "New",
        tripRequestTypeId: 1,
        passengers: tripIds.map((tripId) => ({ tripId })),
      });
    }

    function assignmentOnVehicle(assignmentId: number, vehicleId: number) {
      return {
        ...assignment,
        assignmentId,
        vehicle: { ...vehicle, vehicleId },
      };
    }

    function assignPassengers(
      selections: Array<{ tripId: number; assignmentId: number }>,
    ) {
      return manage.assignInitialRequest({
        tripRequestId: 1,
        passengers: selections.map(({ tripId, assignmentId }) => ({
          tripId,
          vehicleDriverAssignmentId: assignmentId,
          routes: [
            {
              routeName: "مسیر اصلی",
              alternativeNo: 1,
              distanceKm: null,
              estimatedDurationMinute: null,
              isSelected: false,
              description: null,
              points: [
                {
                  locationId: 1,
                  trafficZone: null,
                  sequenceNo: 1,
                  distanceFromStartKm: null,
                  description: null,
                },
              ],
            },
          ],
        })),
      });
    }

    it("allows three passengers when the vehicle has no persisted occupancy", async () => {
      requestFor([1, 2, 3]);
      session.assignment.mockResolvedValue(assignmentOnVehicle(11, 5));
      session.activePassengerCountsByVehicle.mockResolvedValue({});

      const result = await assignPassengers([
        { tripId: 1, assignmentId: 11 },
        { tripId: 2, assignmentId: 11 },
        { tripId: 3, assignmentId: 11 },
      ]);

      expect(result).toEqual({ success: true, id: 1 });
      expect(session.createExecution).toHaveBeenCalledTimes(3);
      expect(session.createExecution).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: 1, status: "Planned" }),
      );
      expect(session.updateRequestStatus).toHaveBeenCalledWith(1, "Assigned");
      expect(session.activePassengerCountsByVehicle).toHaveBeenCalledWith([5]);
    });

    it("rejects one more passenger when the vehicle already has three active passengers", async () => {
      requestFor([1]);
      session.assignment.mockResolvedValue(assignmentOnVehicle(11, 12));
      session.activePassengerCountsByVehicle.mockResolvedValue({ 12: 3 });

      const result = await assignPassengers([
        { tripId: 1, assignmentId: 11 },
      ]);

      expect(result).toEqual({
        success: false,
        error: "VEHICLE_PASSENGER_CAPACITY_EXCEEDED",
      });
      expect(session.createExecution).not.toHaveBeenCalled();
      expect(session.createRoute).not.toHaveBeenCalled();
      expect(session.updateRequestStatus).not.toHaveBeenCalled();
    });

    it("allows one passenger when the vehicle already has two active passengers", async () => {
      requestFor([1]);
      session.assignment.mockResolvedValue(assignmentOnVehicle(11, 12));
      session.activePassengerCountsByVehicle.mockResolvedValue({ 12: 2 });

      const result = await assignPassengers([
        { tripId: 1, assignmentId: 11 },
      ]);

      expect(result).toEqual({ success: true, id: 1 });
      expect(session.createExecution).toHaveBeenCalledTimes(1);
      expect(session.updateRequestStatus).toHaveBeenCalledWith(1, "Assigned");
    });

    it("rejects two passengers when the vehicle already has two active passengers", async () => {
      requestFor([1, 2]);
      session.assignment.mockResolvedValue(assignmentOnVehicle(11, 12));
      session.activePassengerCountsByVehicle.mockResolvedValue({ 12: 2 });

      const result = await assignPassengers([
        { tripId: 1, assignmentId: 11 },
        { tripId: 2, assignmentId: 11 },
      ]);

      expect(result).toEqual({
        success: false,
        error: "VEHICLE_PASSENGER_CAPACITY_EXCEEDED",
      });
      expect(session.createExecution).not.toHaveBeenCalled();
      expect(session.createRoute).not.toHaveBeenCalled();
      expect(session.updateRequestStatus).not.toHaveBeenCalled();
    });

    it("combines different assignment ids on the same vehicle with persisted occupancy", async () => {
      requestFor([1, 2]);
      const catalog = [
        assignmentOnVehicle(204, 12),
        assignmentOnVehicle(450, 12),
      ];
      session.assignment.mockImplementation(async (id: number) =>
        catalog.find((item) => item.assignmentId === id) ?? null,
      );
      session.activePassengerCountsByVehicle.mockResolvedValue({ 12: 2 });

      const result = await assignPassengers([
        { tripId: 1, assignmentId: 204 },
        { tripId: 2, assignmentId: 450 },
      ]);

      expect(result).toEqual({
        success: false,
        error: "VEHICLE_PASSENGER_CAPACITY_EXCEEDED",
      });
      expect(session.activePassengerCountsByVehicle).toHaveBeenCalledWith([12]);
      expect(session.createExecution).not.toHaveBeenCalled();
      expect(session.createRoute).not.toHaveBeenCalled();
      expect(session.updateRequestStatus).not.toHaveBeenCalled();
    });

    it("does not let a full vehicle block a different vehicle that still has capacity", async () => {
      requestFor([1]);
      session.assignment.mockResolvedValue(assignmentOnVehicle(202, 8));
      session.activePassengerCountsByVehicle.mockResolvedValue({ 12: 3, 8: 1 });

      const result = await assignPassengers([
        { tripId: 1, assignmentId: 202 },
      ]);

      expect(result).toEqual({ success: true, id: 1 });
      expect(session.activePassengerCountsByVehicle).toHaveBeenCalledWith([8]);
      expect(session.createExecution).toHaveBeenCalledTimes(1);
      expect(session.updateRequestStatus).toHaveBeenCalledWith(1, "Assigned");
    });
  });
});
