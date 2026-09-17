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
import type { TripRequestStatus } from "./trip-lifecycle";

export interface TripWriteSession {
  requestType(id: number): Promise<TripRequestTypeReference | null>;
  person(id: number): Promise<TripPersonReference | null>;
  location(id: number): Promise<TripLocationReference | null>;
  trip(
    id: number,
  ): Promise<
    | (TripPassengerRecord & { requestedTravelDateTime: Date })
    | null
  >;
  execution(
    id: number,
  ): Promise<
    | {
        tripExecutionId: number;
        tripId: number;
        status: string;
        actualPickupDateTime: Date | null;
      }
    | null
  >;
  requestLifecycle(
    id: number,
  ): Promise<
    | { status: string; hasStartedExecution: boolean }
    | null
  >;
  requestNumbers(jalaliYear: number): Promise<string[]>;
  requestNoExists(requestNo: string): Promise<boolean>;
  assignment(
    id: number,
    activeAt: Date,
  ): Promise<TripAssignmentReference | null>;
  createRequest(input: CreateTripRequestInput): Promise<number>;
  updateRequestStatus(id: number, status: TripRequestStatus): Promise<void>;
  createRoute(input: NewTripRoute): Promise<number>;
  createExecution(input: SaveTripExecutionInput): Promise<number>;
  updateExecution(input: SaveTripExecutionInput & { tripExecutionId: number }): Promise<void>;
  updateSurvey(input: SavePassengerSurveyInput): Promise<void>;
}

export interface TripRepository {
  atomic<T>(work: (session: TripWriteSession) => Promise<T>): Promise<T>;
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
