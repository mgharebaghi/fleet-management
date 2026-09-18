"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeManageIncidents } from "../../composition/incident.factory";
import {
  parseOptionalInteger,
  parseTehranDateTime,
  tripFormValues,
} from "../trip-form-data";
import type { IncidentActionState } from "./incident-form-data";

export async function recordTripAccidentAction(
  tripRequestId: number,
  _state: IncidentActionState,
  data: FormData,
): Promise<IncidentActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  if (values.hasInjury !== "true" && values.hasInjury !== "false") {
    return { error: "INVALID_FORM", values };
  }
  try {
    const result = await makeManageIncidents().recordAccident({
      tripRequestId,
      vehicleAssignmentId: parseOptionalInteger(values.vehicleAssignmentId),
      accidentDateTime:
        parseTehranDateTime(values.accidentDay, values.accidentTime) ??
        new Date(Number.NaN),
      location: values.accidentLocation ?? null,
      description: values.accidentDescription ?? null,
      damageAmount: values.damageAmount?.trim() || null,
      driverFaultPercent: values.driverFaultPercent?.trim() || null,
      policeReportNo: values.policeReportNo ?? null,
      hasInjury: values.hasInjury === "true",
    });
    if (!result.success) return { error: result.error, values };
  } catch {
    return { error: "UNEXPECTED", values };
  }
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(`/trips/${tripRequestId}?tab=execution`);
}

export async function recordTripViolationAction(
  tripRequestId: number,
  _state: IncidentActionState,
  data: FormData,
): Promise<IncidentActionState> {
  const values = tripFormValues(data);
  if (!values) return { error: "INVALID_FORM" };
  try {
    const result = await makeManageIncidents().recordViolation({
      tripRequestId,
      vehicleAssignmentId: parseOptionalInteger(values.vehicleAssignmentId),
      violationDateTime:
        parseTehranDateTime(values.violationDay, values.violationTime) ??
        new Date(Number.NaN),
      violationType: values.violationType ?? "",
      location: values.violationLocation ?? null,
      amount: values.violationAmount ?? "",
      referenceNo: values.referenceNo ?? null,
      description: values.violationDescription ?? null,
    });
    if (!result.success) return { error: result.error, values };
  } catch {
    return { error: "UNEXPECTED", values };
  }
  revalidatePath(`/trips/${tripRequestId}`);
  redirect(`/trips/${tripRequestId}?tab=execution`);
}
