import type {
  CreateTripRequestInput,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  TripAssignmentReference,
  TripLocationReference,
  TripPassengerInput,
  TripPassengerRecord,
  TripPersonReference,
  TripRequestDetails,
  TripRequestList,
  TripRequestTypeReference,
} from "./trip-records";
import type {
  TripRequestLifecycleSnapshot,
  TripRequestStatus,
} from "./trip-lifecycle";

export type TripPassengerWriteRecord = TripPassengerRecord & {
  requestedTravelDateTime: Date;
  requestId: number;
  requestStatus: string;
};

export type TripExecutionWriteRecord = {
  tripExecutionId: number;
  tripId: number;
  status: string;
  actualPickupDateTime: Date | null;
  actualDropoffDateTime: Date | null;
  vehicleDriverAssignmentId: number;
  surveyDateTime: Date | null;
  requestId: number;
  requestStatus: string;
};

export type TripWriteOptions = {
  requestNoYear?: number;
};

export interface TripWriteSession {
  requestType(id: number): Promise<TripRequestTypeReference | null>;
  person(id: number): Promise<TripPersonReference | null>;
  location(id: number): Promise<TripLocationReference | null>;
  trip(id: number): Promise<TripPassengerWriteRecord | null>;
  execution(id: number): Promise<TripExecutionWriteRecord | null>;
  requestLifecycle(id: number): Promise<TripRequestLifecycleSnapshot | null>;
  request(id: number): Promise<{
    tripRequestId: number;
    status: string;
    tripRequestTypeId: number;
    passengers: Array<{
      tripId: number;
      passengerPersonId: number;
      originLocationId: number;
      destinationLocationId: number;
    }>;
  } | null>;
  createPassenger(input: {
    tripRequestId: number;
    passenger: TripPassengerInput;
  }): Promise<number>;
  updatePassenger(input: {
    tripId: number;
    passenger: TripPassengerInput;
  }): Promise<void>;
  deletePassenger(tripId: number): Promise<void>;
  requestNumbers(jalaliYear: number): Promise<string[]>;
  lockRequestNumberYear(jalaliYear: number): Promise<void>;
  requestNoExists(requestNo: string): Promise<boolean>;
  assignment(
    id: number,
    activeAt: Date,
  ): Promise<TripAssignmentReference | null>;
  activePassengerCountsByVehicle(
    vehicleIds: readonly number[],
  ): Promise<Readonly<Record<number, number>>>;
  createRequest(input: CreateTripRequestInput): Promise<{
    tripRequestId: number;
    tripIds: number[];
  }>;
  updateRequestStatus(id: number, status: TripRequestStatus): Promise<void>;
  cancelPlannedExecutions(tripRequestId: number): Promise<void>;
  startTripExecutions(tripRequestId: number): Promise<void>;
  route(id: number): Promise<{
    routeId: number;
    tripId: number | null;
    tripExecutionId: number | null;
    isSelected: boolean;
  } | null>;
  createRoute(input: NewTripRoute): Promise<number>;
  updateRoute(input: NewTripRoute & { routeId: number }): Promise<void>;
  deleteRoute(id: number): Promise<void>;
  deselectOtherSelectedRoutes(input: {
    tripId: number | null;
    tripExecutionId: number | null;
  }): Promise<void>;
  createExecution(input: SaveTripExecutionInput): Promise<number>;
  updateExecution(
    input: SaveTripExecutionInput & { tripExecutionId: number },
  ): Promise<void>;
  updateSurvey(input: SavePassengerSurveyInput): Promise<void>;
}

export interface TripRepository {
  atomic<T>(
    work: (session: TripWriteSession) => Promise<T>,
    options?: TripWriteOptions,
  ): Promise<T>;
  list(
    search: string,
    status: string,
    page: number,
  ): Promise<TripRequestList>;
  details(id: number): Promise<TripRequestDetails | null>;
  requestTypes(): Promise<TripRequestTypeReference[]>;
  availablePeople(): Promise<TripPersonReference[]>;
  availableLocations(): Promise<TripLocationReference[]>;
  assignmentsActiveAt(dateTime: Date): Promise<TripAssignmentReference[]>;
  activePassengerCountsByVehicle(
    vehicleIds: readonly number[],
  ): Promise<Readonly<Record<number, number>>>;
  countPendingRequests(): Promise<number>;
}
