"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeManageTrips, makeReadTrips } from "../composition/trip.factory";
import type {
  TripPassengerInput,
  TripResult,
} from "../application/trip-records";
import {
  consecutiveFormIndexes,
  parseOptionalInteger,
  parseTehranDateTime,
  tripErrorFields,
  tripFormValues,
  type TripActionState,
} from "./trip-form-data";
import {
  wizardFieldForLocationFailure,
  type CreateWizardAssignments,
  type CreateWizardPayload,
} from "./create-request/create-wizard";

function passengerRequestedPickupDateTime(
  values: Record<string, string>,
  passengerIndex: number,
  inheritedDateTime: Date,
): Date {
  if (values[`passenger.${passengerIndex}.pickupOverride`] !== "true") {
    return inheritedDateTime;
  }
  return (
    parseTehranDateTime(
      values[`passenger.${passengerIndex}.pickupDay`],
      values[`passenger.${passengerIndex}.pickupTime`],
    ) ?? new Date(Number.NaN)
  );
}

async function run(
  values: Record<string, string>,
  work: () => Promise<TripResult>,
): Promise<TripActionState | { id: number }> {
  let result: TripResult;
  try {
    result = await work();
  } catch {
    return { error: "UNEXPECTED", values };
  }
  return result.success
    ? { id: result.id }
    : {
        error: result.error,
        field: result.failedLocation
          ? undefined
          : result.field ?? tripErrorFields[result.error],
        failedLocation: result.failedLocation,
        values,
      };
}

function requestedTravelDateTime(
  values: Record<string, string>,
): Date {
  return (
    parseTehranDateTime(
      values.requestedTravelDay,
      values.requestedTravelTime,
    ) ?? new Date(Number.NaN)
  );
}

export async function cancelTripRequestAction(
  tripRequestId: number,
  state: TripActionState,
): Promise<TripActionState> {
  const result = await run(state.values ?? {}, () =>
    makeManageTrips().cancelRequest(tripRequestId),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  revalidatePath("/trips/requests");
  redirect(`/trips/${tripRequestId}`);
}

export async function changeTripRequestStatusAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState & { success?: boolean }> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const status = values.requestStatus ?? "";
  const enteredDeparture =
    status === "InProgress"
      ? parseTehranDateTime(values.actualDepartureDay, values.actualDepartureTime)
      : null;
  if (enteredDeparture && Number.isNaN(enteredDeparture.getTime())) {
    return { error: "INVALID_DATE", field: "actualDepartureDay", values };
  }
  const result = await run(values, () =>
    makeManageTrips().changeRequestStatus(
      tripRequestId,
      status,
      enteredDeparture,
    ),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  revalidatePath("/trips/requests");
  return { ...result, success: true, values };
}

export async function startTripAction(
  tripRequestId: number,
  state: TripActionState = {},
): Promise<TripActionState & { success?: boolean }> {
  const result = await run(state.values ?? {}, () =>
    makeManageTrips().startTrip(tripRequestId),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { success: true };
}

export async function addTripRouteAction(
  tripRequestId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState & { success?: boolean }> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const pointIndexes = consecutiveFormIndexes(
    values,
    (index) => `point.${index}.locationId`,
  );

  const routeId = parseOptionalInteger(values.routeId);

  const result = await run(values, () =>
    makeManageTrips().saveRoute({
      routeId: routeId && !Number.isNaN(routeId) ? routeId : null,
      tripId: Number(values.tripId),
      tripExecutionId: null,
      routeName: values.routeName ?? "",
      alternativeNo: parseOptionalInteger(values.alternativeNo),
      distanceKm: values.distanceKm?.trim() || null,
      estimatedDurationMinute: parseOptionalInteger(
        values.estimatedDurationMinute,
      ),
      isSelected: values.isSelected === "true",
      description: values.routeDescription ?? null,
      points: pointIndexes.map((index) => ({
        locationId: Number(values[`point.${index}.locationId`]),
        trafficZone: values[`point.${index}.trafficZone`] ?? null,
        sequenceNo: parseOptionalInteger(
          values[`point.${index}.sequenceNo`],
        ),
        distanceFromStartKm:
          values[`point.${index}.distanceFromStartKm`]?.trim() || null,
        description: values[`point.${index}.description`] ?? null,
      })),
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  return { success: true };
}

export async function deleteTripRouteAction(
  tripRequestId: number,
  routeId: number,
  state: TripActionState = {},
): Promise<TripActionState & { success?: boolean }> {
  const result = await run(state.values ?? {}, () =>
    makeManageTrips().deleteRoute({ tripRequestId, routeId }),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  return { success: true };
}

function parsePassengerFormData(
  values: Record<string, string>,
): TripPassengerInput {
  const personId =
    values["passenger.0.personId"] ||
    values.passengerPersonId ||
    values.personId;
  const originLocationId =
    values["passenger.0.originLocationId"] ||
    values.originLocationId;
  const destinationLocationId =
    values["passenger.0.destinationLocationId"] ||
    values.destinationLocationId;
  const pickupDay =
    values["passenger.0.pickupDay"] || values.pickupDay;
  const pickupTime =
    values["passenger.0.pickupTime"] || values.pickupTime;
  const pickupOrder =
    values["passenger.0.pickupOrder"] || values.pickupOrder;
  const dropoffOrder =
    values["passenger.0.dropoffOrder"] || values.dropoffOrder;
  const description =
    values["passenger.0.description"] || values.description;
  const status =
    values["passenger.0.status"] || values.status;

  return {
    passengerPersonId: Number(personId),
    originLocationId: Number(originLocationId),
    destinationLocationId: Number(destinationLocationId),
    requestedPickupDateTime: parseTehranDateTime(pickupDay, pickupTime),
    pickupOrder: parseOptionalInteger(pickupOrder),
    dropoffOrder: parseOptionalInteger(dropoffOrder),
    status: status?.trim() || null,
    description: description?.trim() || null,
  };
}

export async function addTripPassengerAction(
  tripRequestId: number,
  state: TripActionState,
  data: FormData,
): Promise<TripActionState & { success?: boolean }> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const passenger = parsePassengerFormData(values);

  const result = await run(values, () =>
    makeManageTrips().addPassenger({
      tripRequestId,
      passenger,
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { success: true };
}

export async function updateTripPassengerAction(
  tripRequestId: number,
  tripId: number,
  state: TripActionState,
  data: FormData,
): Promise<TripActionState & { success?: boolean }> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  const passenger = parsePassengerFormData(values);

  const result = await run(values, () =>
    makeManageTrips().updatePassenger({
      tripRequestId,
      tripId,
      passenger,
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { success: true };
}

export async function deleteTripPassengerAction(
  tripRequestId: number,
  tripId: number,
  state: TripActionState = {},
): Promise<TripActionState & { success?: boolean }> {
  const result = await run(state.values ?? {}, () =>
    makeManageTrips().deletePassenger({ tripRequestId, tripId }),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { success: true };
}

export async function saveTripExecutionAction(
  tripRequestId: number,
  tripId: number,
  tripExecutionId: number | null,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  const result = await run(values, () =>
    makeManageTrips().saveExecution({
      tripId,
      tripExecutionId,
      vehicleDriverAssignmentId: Number(values.assignmentId),
      actualPickupDateTime: parseTehranDateTime(
        values.actualPickupDay,
        values.actualPickupTime,
      ),
      actualDropoffDateTime: parseTehranDateTime(
        values.actualDropoffDay,
        values.actualDropoffTime,
      ),
      startOdometer: values.startOdometer?.trim() || null,
      endOdometer: values.endOdometer?.trim() || null,
      status:
        values.executionStatus ??
        (tripExecutionId === null ? "Planned" : ""),
      description: values.executionDescription ?? null,
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  redirect(
    `/trips/${tripRequestId}?tab=${tripExecutionId === null ? "assignment" : "completion"}`,
  );
}

export type PassengerExecutionSave = {
  tripId: number;
  tripExecutionId: number;
  values: Record<string, string>;
};

export type PassengerExecutionBatchResult = {
  savedTripIds: number[];
  failed?: {
    tripId: number;
    error: TripActionState["error"];
    field?: string;
  };
};

export async function savePassengerExecutionsAction(
  tripRequestId: number,
  items: PassengerExecutionSave[],
): Promise<PassengerExecutionBatchResult> {
  const savedTripIds: number[] = [];

  for (const item of items) {
    const result = await run(item.values, () =>
      makeManageTrips().saveExecution({
        tripId: item.tripId,
        tripExecutionId: item.tripExecutionId,
        vehicleDriverAssignmentId: Number(item.values.assignmentId),
        actualPickupDateTime: parseTehranDateTime(
          item.values.actualPickupDay,
          item.values.actualPickupTime,
        ),
        actualDropoffDateTime: parseTehranDateTime(
          item.values.actualDropoffDay,
          item.values.actualDropoffTime,
        ),
        startOdometer: item.values.startOdometer?.trim() || null,
        endOdometer: item.values.endOdometer?.trim() || null,
        status: item.values.executionStatus ?? "",
        description: item.values.executionDescription ?? null,
      }),
    );

    if (!("id" in result)) {
      return {
        savedTripIds,
        failed: { tripId: item.tripId, error: result.error, field: result.field },
      };
    }

    savedTripIds.push(item.tripId);
  }

  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { savedTripIds };
}

export async function savePassengerSurveyAction(
  tripRequestId: number,
  tripExecutionId: number,
  _state: TripActionState,
  data: FormData,
): Promise<TripActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };

  const result = await run(values, () =>
    makeManageTrips().saveSurvey({
      tripExecutionId,
      passengerRating: parseOptionalInteger(values.passengerRating),
      passengerComment: values.passengerComment ?? null,
    }),
  );

  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(`/trips/${tripRequestId}?tab=completion`);
}

export async function loadCreateTripAssignmentsAction(
  values: Record<string, string>,
): Promise<CreateWizardAssignments> {
  const passengerIndexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );
  const travelDateTime = requestedTravelDateTime(values);
  const reader = makeReadTrips();
  const entries = await Promise.all(
    passengerIndexes.map(async (index) => {
      const activeAt = passengerRequestedPickupDateTime(
        values,
        index,
        travelDateTime,
      );
      const assignments = await reader.assignmentsActiveAt(activeAt);
      return [index, assignments] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export type CreateCompleteTripRequestResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
      field?: string;
      failedLocation?: {
        passengerIndex: number;
        locationRole: "origin" | "destination";
      };
    };

export type CreateTripRequestResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
      field?: string;
      failedLocation?: {
        passengerIndex: number;
        locationRole: "origin" | "destination";
      };
    };

export async function createTripRequestAction(
  values: Record<string, string>,
): Promise<CreateTripRequestResult> {
  const passengerIndexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );
  const commonOrigin = values.commonOriginLocationId;
  const commonDestination = values.commonDestinationLocationId;
  const travelDateTime = requestedTravelDateTime(values);

  let result: TripResult;
  try {
    result = await makeManageTrips().createRequest({
      tripRequestTypeId: Number(values.tripRequestTypeId),
      requestedTravelDateTime: travelDateTime,
      purpose: values.purpose ?? null,
      description: values.requestDescription ?? null,
      passengers: passengerIndexes.map((index) => ({
        passengerPersonId: Number(values[`passenger.${index}.personId`]),
        originLocationId: Number(
          commonOrigin || values[`passenger.${index}.originLocationId`],
        ),
        destinationLocationId: Number(
          commonDestination ||
            values[`passenger.${index}.destinationLocationId`],
        ),
        requestedPickupDateTime: travelDateTime,
        pickupOrder: parseOptionalInteger(
          values[`passenger.${index}.pickupOrder`],
        ),
        dropoffOrder: parseOptionalInteger(
          values[`passenger.${index}.dropoffOrder`],
        ),
        status: null,
        description: values[`passenger.${index}.description`] ?? null,
      })),
    });
  } catch {
    return { success: false, error: "UNEXPECTED" };
  }

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      field: result.failedLocation
        ? wizardFieldForLocationFailure(
            values.requestTypeCode,
            result.failedLocation,
          )
        : result.field ?? tripErrorFields[result.error],
      failedLocation: result.failedLocation,
    };
  }
  revalidatePath("/trips", "layout");
  redirect("/trips");
}

export type AssignInitialTripRequestPayload = {
  tripRequestId: number;
  assignments: Record<number, number>;
  routes: Array<{
    tripId: number;
    routeName: string;
    alternativeNo: number | null;
    distanceKm: string | null;
    estimatedDurationMinute: number | null;
    isSelected: boolean;
    description: string | null;
    points: Array<{
      locationId: number;
      trafficZone: string | null;
      sequenceNo: number | null;
      distanceFromStartKm: string | null;
      description: string | null;
    }>;
  }>;
};

export async function assignInitialTripRequestAction(
  payload: AssignInitialTripRequestPayload,
): Promise<{ success: true } | { success: false; error: string; field?: string }> {
  let result: TripResult;
  try {
    const passengers = Object.entries(payload.assignments).map(
      ([tripIdStr, assignmentId]) => {
        const tripId = Number(tripIdStr);
        const passengerRoutes = payload.routes
          .filter((route) => route.tripId === tripId)
          .map((route) => ({
            routeName: route.routeName,
            alternativeNo: route.alternativeNo,
            distanceKm: route.distanceKm,
            estimatedDurationMinute: route.estimatedDurationMinute,
            isSelected: route.isSelected,
            description: route.description,
            points: route.points,
          }));
        return {
          tripId,
          vehicleDriverAssignmentId: assignmentId,
          routes: passengerRoutes,
        };
      },
    );

    result = await makeManageTrips().assignInitialRequest({
      tripRequestId: payload.tripRequestId,
      passengers,
    });
  } catch {
    return { success: false, error: "UNEXPECTED" };
  }

  if (!result.success) {
    return { success: false, error: result.error, field: result.field };
  }

  revalidatePath("/trips", "layout");
  redirect(`/trips/${payload.tripRequestId}`);
}

export async function createCompleteTripRequestAction(
  payload: CreateWizardPayload,
): Promise<CreateCompleteTripRequestResult> {
  const { values, assignments, routes } = payload;
  const passengerIndexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );
  const commonOrigin = values.commonOriginLocationId;
  const commonDestination = values.commonDestinationLocationId;
  const travelDateTime = requestedTravelDateTime(values);

  let result: TripResult;
  try {
    result = await makeManageTrips().createCompleteRequest({
      tripRequestTypeId: Number(values.tripRequestTypeId),
      requestedTravelDateTime: travelDateTime,
      purpose: values.purpose ?? null,
      description: values.requestDescription ?? null,
      passengers: passengerIndexes.map((index) => ({
        passengerPersonId: Number(values[`passenger.${index}.personId`]),
        originLocationId: Number(
          commonOrigin || values[`passenger.${index}.originLocationId`],
        ),
        destinationLocationId: Number(
          commonDestination || values[`passenger.${index}.destinationLocationId`],
        ),
        requestedPickupDateTime: passengerRequestedPickupDateTime(
          values,
          index,
          travelDateTime,
        ),
        pickupOrder: parseOptionalInteger(values[`passenger.${index}.pickupOrder`]),
        dropoffOrder: parseOptionalInteger(values[`passenger.${index}.dropoffOrder`]),
        status: null,
        description: values[`passenger.${index}.description`] ?? null,
        vehicleDriverAssignmentId: assignments[index] ?? Number.NaN,
        routes: routes
          .filter((route) => route.passengerKey === index)
          .map((route) => ({
            routeName: route.routeName,
            alternativeNo: route.alternativeNo,
            distanceKm: route.distanceKm,
            estimatedDurationMinute: route.estimatedDurationMinute,
            isSelected: route.isSelected,
            description: route.description,
            points: route.points,
          })),
      })),
    });
  } catch {
    return { success: false, error: "UNEXPECTED" };
  }

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      field: result.failedLocation
        ? wizardFieldForLocationFailure(values.requestTypeCode, result.failedLocation)
        : result.field ?? tripErrorFields[result.error],
      failedLocation: result.failedLocation,
    };
  }
  revalidatePath("/trips", "layout");
  redirect(`/trips/${result.id}`);
}
