"use server";


import { revalidatePath } from "next/cache";

import { makeManageTrips } from "../../composition/trip.factory";
import type { TripPassengerInput } from "../../application/trip-records";
import { parseOptionalInteger, parseTehranDateTime, tripFormValues, type TripActionState } from "../trip-form-data";

import { runTripAction } from "../trip-action-runner";

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

  const result = await runTripAction(values, () =>
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

  const result = await runTripAction(values, () =>
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
  const result = await runTripAction(state.values ?? {}, () =>
    makeManageTrips().deletePassenger({ tripRequestId, tripId }),
  );
  if (!("id" in result)) return result;
  revalidatePath(`/trips/${tripRequestId}`);
  revalidatePath("/trips");
  return { success: true };
}
