import type {
  CreateTripRequestInput,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  TripAssignmentReference,
  TripLocationReference,
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
  requestNumbers(jalaliYear: number): Promise<string[]>;
  requestNoExists(requestNo: string): Promise<boolean>;
  assignment(
    id: number,
    activeAt: Date,
  ): Promise<TripAssignmentReference | null>;
  createRequest(input: CreateTripRequestInput): Promise<number>;
  updateRequestStatus(id: number, status: TripRequestStatus): Promise<void>;
  cancelPlannedExecutions(tripRequestId: number): Promise<void>;
  createRoute(input: NewTripRoute): Promise<number>;
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
}
