import type { TripRepository } from "./trip-repository";
import type {
  AssignInitialTripRequestCommand,
  CreateTripRequestCommand,
  NewTripRoute,
  SavePassengerSurveyInput,
  SaveTripExecutionInput,
  SaveTripRouteInput,
  TripPassengerInput,
  TripResult,
} from "./trip-records";

import {
  createRequest,
  changeRequestStatus,
  cancelRequest,
  startTrip,
} from "./requests/manage-trip-requests";
import { assignInitialRequest } from "./assignment/manage-trip-assignment";
import {
  addPassenger,
  updatePassenger,
  deletePassenger,
} from "./passengers/manage-trip-passengers";
import { saveRoute, addRoute, deleteRoute } from "./routes/manage-trip-routes";
import { saveExecution } from "./executions/manage-trip-executions";
import { saveSurvey } from "./surveys/manage-trip-surveys";

export class ManageTrips {
  constructor(private readonly repository: TripRepository) {}

  createRequest(input: CreateTripRequestCommand): Promise<TripResult> {
    return createRequest(this.repository, input);
  }

  assignInitialRequest(input: AssignInitialTripRequestCommand): Promise<TripResult> {
    return assignInitialRequest(this.repository, input);
  }

  addPassenger(input: {
    tripRequestId: number;
    passenger: TripPassengerInput;
  }): Promise<TripResult> {
    return addPassenger(this.repository, input);
  }

  updatePassenger(input: {
    tripRequestId: number;
    tripId: number;
    passenger: TripPassengerInput;
  }): Promise<TripResult> {
    return updatePassenger(this.repository, input);
  }

  deletePassenger(input: {
    tripRequestId: number;
    tripId: number;
  }): Promise<TripResult> {
    return deletePassenger(this.repository, input);
  }

  changeRequestStatus(tripRequestId: number, targetStatus: string, enteredDeparture: Date | null = null): Promise<TripResult> {
    return changeRequestStatus(this.repository, tripRequestId, targetStatus, enteredDeparture);
  }

  cancelRequest(tripRequestId: number): Promise<TripResult> {
    return cancelRequest(this.repository, tripRequestId);
  }

  startTrip(tripRequestId: number): Promise<TripResult> {
    return startTrip(this.repository, tripRequestId);
  }

  saveRoute(input: SaveTripRouteInput, expectedTripRequestId?: number): Promise<TripResult> {
    return saveRoute(this.repository, input, expectedTripRequestId);
  }

  addRoute(input: NewTripRoute): Promise<TripResult> {
    return addRoute(this.repository, input);
  }

  deleteRoute(input: {
    tripRequestId: number;
    routeId: number;
  }): Promise<TripResult> {
    return deleteRoute(this.repository, input);
  }

  saveExecution(input: SaveTripExecutionInput, expectedTripRequestId?: number): Promise<TripResult> {
    return saveExecution(this.repository, input, expectedTripRequestId);
  }

  saveSurvey(input: SavePassengerSurveyInput, expectedTripRequestId?: number): Promise<TripResult> {
    return saveSurvey(this.repository, input, expectedTripRequestId);
  }
}
