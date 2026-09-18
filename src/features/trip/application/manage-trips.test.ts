import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManageTrips } from "./manage-trips";
import type {
  TripRepository,
  TripWriteSession,
} from "./trip-repository";
import type {
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
  person: vi.fn(),
  location: vi.fn(),
  trip: vi.fn(),
  execution: vi.fn(),
  assignment: vi.fn(),
  createRequest: vi.fn(),
  updateRequestStatus: vi.fn(),
  cancelPlannedExecutions: vi.fn(),
  createRoute: vi.fn(),
  deselectOtherSelectedRoutes: vi.fn(),
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
} satisfies TripRepository;

const manage = new ManageTrips(repository);

const createInput: CreateTripRequestCommand = {
  tripRequestTypeId: 1,
  requestDateTime: new Date("2026-01-01T08:00:00Z"),
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
  session.createRequest.mockResolvedValue(10);
  session.createRoute.mockResolvedValue(20);
  session.createExecution.mockResolvedValue(30);
  session.cancelPlannedExecutions.mockResolvedValue(undefined);
  session.deselectOtherSelectedRoutes.mockResolvedValue(undefined);
});

describe("create Trip request", () => {
  it("normalizes and creates a request with its passenger Trips atomically", async () => {
    expect(await manage.createRequest(createInput)).toEqual({
      success: true,
      id: 10,
    });
    expect(session.createRequest).toHaveBeenCalledWith({
      ...createInput,
      requestNo: "TR-1404-0001",
      purpose: "مأموریت",
      status: "New",
      description: "توضیح",
    });
  });

  it.each([
    [{ requestDateTime: new Date("invalid") }, "INVALID_DATE"],
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
      success: false,
      error: "EXECUTION_NOT_STARTED",
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

  it("requires pickup without dropoff for InProgress and both times for Completed", async () => {
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        actualPickupDateTime: null,
      }),
    ).toEqual({ success: false, error: "MISSING_ACTUAL_PICKUP" });
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        actualDropoffDateTime: new Date("2026-02-01T10:00:00Z"),
      }),
    ).toEqual({ success: false, error: "UNEXPECTED_ACTUAL_DROPOFF" });
    expect(
      await manage.saveExecution({
        ...startedExecutionInput,
        status: "Completed",
      }),
    ).toEqual({ success: false, error: "MISSING_ACTUAL_DROPOFF" });
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
});
