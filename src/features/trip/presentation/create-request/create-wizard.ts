import { formatGregorianDateAsJalali } from "../../../../components/ui/date-picker/jalali-date";
import type {
  NewTripRouteDetails,
  TripAssignmentReference,
  TripLocationInputFailure,
  TripLocationReference,
  TripPersonReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { consecutiveFormIndexes } from "../trip-form-data";

export type CreateWizardStep = 1 | 2 | 3;

export type HandlingWizardStep = 1 | 2 | 3 | 4;

export type CreateWizardPassenger = {
  key: number;
  personId: number;
  personName: string;
  personnelNo: string | null;
  originName: string;
  destinationName: string;
  requestedPickupAt: string;
  requestedPickupLabel: string;
};

export type CreateWizardRoute = NewTripRouteDetails & {
  key: string;
  passengerKey: number;
};

export type CreateWizardPayload = {
  values: Record<string, string>;
  assignments: Record<number, number>;
  routes: CreateWizardRoute[];
};

export type CreateWizardAssignments = Record<
  number,
  TripAssignmentReference[]
>;

export function routePointLocationError(
  points: readonly { locationId: number | null }[],
): string | null {
  const missingIndex = points.findIndex((point) => !point.locationId);
  return missingIndex < 0
    ? null
    : `لطفاً مکان را برای نقطه ${missingIndex + 1} انتخاب کنید.`;
}

export const CREATE_WIZARD_STEPS = [
  { id: "request", label: "اطلاعات درخواست" },
  { id: "passengers", label: "مسافران" },
  { id: "review", label: "مرور و تأیید" },
] as const;

export const HANDLING_WIZARD_STEPS = [
  { id: "review", label: "بررسی درخواست" },
  { id: "assignment", label: "راننده و خودرو" },
  { id: "route", label: "مسیر" },
  { id: "planning", label: "تأیید و تخصیص" },
] as const;

export const requestStepFieldLabels: Record<string, string> = {
  tripRequestTypeId: "نوع درخواست",
  requestedTravelDay: "تاریخ درخواست سفر",
  requestedTravelTime: "زمان درخواست سفر",
  commonOriginLocationId: "مبدأ مشترک",
  commonDestinationLocationId: "مقصد مشترک",
};

export function typeExplanation(typeCode: string) {
  switch (typeCode) {
    case "COMMON_ORIGIN":
      return "یک مبدأ مشترک برای همهٔ مسافران؛ مقصد هر نفر جداگانه ثبت می‌شود.";
    case "COMMON_DESTINATION":
      return "یک مقصد مشترک برای همهٔ مسافران؛ مبدأ هر نفر جداگانه ثبت می‌شود.";
    case "COMMON_ORIGIN_DESTINATION":
      return "مبدأ و مقصد برای همهٔ مسافران یکسان است و در پروندهٔ هر مسافر تکرار می‌شود.";
    default:
      return "مبدأ و مقصد را برای هر مسافر مطابق همین درخواست ثبت کنید.";
  }
}

export function sharesOrigin(typeCode: string | undefined) {
  return (
    typeCode === "COMMON_ORIGIN" ||
    typeCode === "COMMON_ORIGIN_DESTINATION"
  );
}

export function sharesDestination(typeCode: string | undefined) {
  return (
    typeCode === "COMMON_DESTINATION" ||
    typeCode === "COMMON_ORIGIN_DESTINATION"
  );
}

export function wizardStepForField(
  field: string | undefined,
  error?: string,
): CreateWizardStep {
  if (error === "PASSENGER_REQUIRED") return 2;
  if (field?.startsWith("passenger.")) return 2;
  return 1;
}

export function wizardFieldForLocationFailure(
  typeCode: string | undefined,
  failedLocation: TripLocationInputFailure,
): string {
  if (failedLocation.locationRole === "origin") {
    return sharesOrigin(typeCode)
      ? "commonOriginLocationId"
      : `passenger.${failedLocation.passengerIndex}.originLocationId`;
  }
  return sharesDestination(typeCode)
    ? "commonDestinationLocationId"
    : `passenger.${failedLocation.passengerIndex}.destinationLocationId`;
}

export function isLocationField(name: string) {
  return (
    name === "commonOriginLocationId" ||
    name === "commonDestinationLocationId" ||
    name.endsWith(".originLocationId") ||
    name.endsWith(".destinationLocationId")
  );
}

export function mergePreservedLocationValues(
  preserved: Record<string, string>,
  formValues: Record<string, string>,
): Record<string, string> {
  const next = { ...preserved };
  for (const [name, value] of Object.entries(formValues)) {
    if (isLocationField(name)) next[name] = value;
  }
  return next;
}

export function preservedLocationValue(
  preserved: Record<string, string>,
  submitted: Record<string, string> | undefined,
  name: string,
) {
  if (name in preserved) return preserved[name];
  return submitted?.[name] ?? "";
}

export type WizardErrorFocus = {
  step: CreateWizardStep;
  fields: string[];
};

export function wizardLocationErrorFocus(
  error: string | undefined,
  typeCode: string | undefined,
  failedLocation: TripLocationInputFailure | undefined,
): WizardErrorFocus | null {
  if (
    (error !== "LOCATION_NOT_FOUND" && error !== "LOCATION_INACTIVE") ||
    !failedLocation
  ) {
    return null;
  }
  const field = wizardFieldForLocationFailure(typeCode, failedLocation);
  return {
    step: wizardStepForField(field, error),
    fields: [field],
  };
}

export function wizardErrorNavigation(
  error: string | undefined,
  field: string | undefined,
  typeCode: string | undefined,
  failedLocation: TripLocationInputFailure | undefined,
): WizardErrorFocus {
  return (
    wizardLocationErrorFocus(error, typeCode, failedLocation) ?? {
      step: wizardStepForField(field, error),
      fields: field ? [field] : [],
    }
  );
}

export function shouldSubmitCreateForm(reviewOpen: boolean) {
  return reviewOpen;
}

export function requestStepGaps(
  values: Record<string, string>,
  typeCode: string | undefined,
): string[] {
  const gaps: string[] = [];
  if (!values.tripRequestTypeId) gaps.push("tripRequestTypeId");
  if (!values.requestedTravelDay) gaps.push("requestedTravelDay");
  if (!values.requestedTravelTime) gaps.push("requestedTravelTime");
  if (sharesOrigin(typeCode) && !values.commonOriginLocationId) {
    gaps.push("commonOriginLocationId");
  }
  if (sharesDestination(typeCode) && !values.commonDestinationLocationId) {
    gaps.push("commonDestinationLocationId");
  }
  return gaps;
}

export function passengerStepGaps(
  values: Record<string, string>,
  typeCode: string | undefined,
): string[] {
  const indexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );
  if (indexes.length === 0) return ["passenger.0.personId"];

  const gaps: string[] = [];
  for (const index of indexes) {
    if (!values[`passenger.${index}.personId`]) {
      gaps.push(`passenger.${index}.personId`);
    }
    if (
      !sharesOrigin(typeCode) &&
      !values[`passenger.${index}.originLocationId`]
    ) {
      gaps.push(`passenger.${index}.originLocationId`);
    }
    if (
      !sharesDestination(typeCode) &&
      !values[`passenger.${index}.destinationLocationId`]
    ) {
      gaps.push(`passenger.${index}.destinationLocationId`);
    }
    if (values[`passenger.${index}.pickupOverride`] === "true") {
      if (!values[`passenger.${index}.pickupDay`]) {
        gaps.push(`passenger.${index}.pickupDay`);
      }
      if (!values[`passenger.${index}.pickupTime`]) {
        gaps.push(`passenger.${index}.pickupTime`);
      }
    }
  }
  return gaps;
}

export function gapNotice(gaps: string[]) {
  const labels = gaps.map(
    (gap) =>
      requestStepFieldLabels[gap] ??
      (gap.includes("personId")
        ? "مسافر"
        : gap.includes("originLocationId")
          ? "مبدأ"
          : gap.includes("destinationLocationId")
            ? "مقصد"
            : gap.includes("pickup")
              ? "زمان سوارشدن متفاوت"
              : "فیلد الزامی"),
  );
  const unique = [...new Set(labels)];
  return `برای ادامه، ${unique.join("، ")} را کامل کنید.`;
}

export type TripRequestReviewPassenger = {
  personName: string;
  originName: string;
  destinationName: string;
  pickup: string | null;
  pickupOrder: string | null;
  dropoffOrder: string | null;
  description: string | null;
};

export type TripRequestReview = {
  requestTypeName: string;
  purpose: string | null;
  travelAt: string;
  commonOriginName: string | null;
  commonDestinationName: string | null;
  description: string | null;
  passengers: TripRequestReviewPassenger[];
};

function displayName(
  items: { id: string; name: string }[],
  id: string | undefined,
) {
  if (!id) return "";
  return items.find((item) => item.id === id)?.name ?? "";
}

function jalaliWhen(day: string | undefined, time: string | undefined) {
  if (!day) return "";
  const date = formatGregorianDateAsJalali(day);
  return time ? `${date}، ${time}` : date;
}

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createRequestReview(
  values: Record<string, string>,
  catalogs: {
    requestTypes: TripRequestTypeReference[];
    people: TripPersonReference[];
    locations: TripLocationReference[];
  },
): TripRequestReview {
  const requestType = catalogs.requestTypes.find(
    (type) => String(type.tripRequestTypeId) === values.tripRequestTypeId,
  );
  const people = catalogs.people.map((person) => ({
    id: String(person.personId),
    name: `${person.firstName} ${person.lastName}`.trim(),
  }));
  const locations = catalogs.locations.map((location) => ({
    id: String(location.locationId),
    name: location.locationName,
  }));
  const commonOriginName = sharesOrigin(requestType?.typeCode)
    ? displayName(locations, values.commonOriginLocationId) || null
    : null;
  const commonDestinationName = sharesDestination(requestType?.typeCode)
    ? displayName(locations, values.commonDestinationLocationId) || null
    : null;
  const indexes = consecutiveFormIndexes(
    values,
    (index) => `passenger.${index}.personId`,
  );

  return {
    requestTypeName: requestType?.typeName ?? "",
    purpose: optional(values.purpose),
    travelAt: jalaliWhen(values.requestedTravelDay, values.requestedTravelTime),
    commonOriginName,
    commonDestinationName,
    description: optional(values.requestDescription),
    passengers: indexes.map((index) => ({
      personName: displayName(people, values[`passenger.${index}.personId`]),
      originName:
        commonOriginName ??
        displayName(locations, values[`passenger.${index}.originLocationId`]),
      destinationName:
        commonDestinationName ??
        displayName(
          locations,
          values[`passenger.${index}.destinationLocationId`],
        ),
      pickup: optional(
        jalaliWhen(
          values[`passenger.${index}.pickupDay`],
          values[`passenger.${index}.pickupTime`],
        ),
      ),
      pickupOrder: optional(values[`passenger.${index}.pickupOrder`]),
      dropoffOrder: optional(values[`passenger.${index}.dropoffOrder`]),
      description: optional(values[`passenger.${index}.description`]),
    })),
  };
}

export function reviewContainsRawId(
  review: TripRequestReview,
  ids: readonly number[],
) {
  const blob = JSON.stringify(review);
  return ids.some((id) => blob.includes(String(id)));
}

export type TripRequestSummaryPreview = {
  requestTypeName: string | null;
  purpose: string | null;
  travelAt: string | null;
  originName: string | null;
  destinationName: string | null;
  passengerCount: number;
};

export function passengerIndexFromField(field: string | undefined): number | null {
  const match = field?.match(/^passenger\.(\d+)\./);
  return match ? Number(match[1]) : null;
}

const passengerFieldSuffixes = [
  "personId",
  "originLocationId",
  "destinationLocationId",
  "pickupOverride",
  "pickupDay",
  "pickupTime",
  "pickupOrder",
  "dropoffOrder",
  "description",
] as const;

export function passengerFieldNames(index: number) {
  return passengerFieldSuffixes.map(
    (suffix) => `passenger.${index}.${suffix}` as const,
  );
}

export function extractPassengerSnapshot(
  values: Record<string, string>,
  index: number,
): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const name of passengerFieldNames(index)) {
    if (name in values) snapshot[name] = values[name];
  }
  return snapshot;
}

export function mergePassengerSnapshots(
  current: Record<number, Record<string, string>>,
  values: Record<string, string>,
  passengerCount: number,
): Record<number, Record<string, string>> {
  const next: Record<number, Record<string, string>> = {};
  for (let index = 0; index < passengerCount; index += 1) {
    next[index] = {
      ...(current[index] ?? {}),
      ...extractPassengerSnapshot(values, index),
    };
  }
  return next;
}

export function dropPassengerSnapshot(
  snapshots: Record<number, Record<string, string>>,
  removedIndex: number,
): Record<number, Record<string, string>> {
  const next = { ...snapshots };
  delete next[removedIndex];
  return next;
}

export function prunePassengerValues(
  values: Record<string, string>,
  passengerCount: number,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => {
      const match = key.match(/^passenger\.(\d+)\./);
      if (!match) return true;
      return Number(match[1]) < passengerCount;
    }),
  );
}

export function hasPassengerPickupOverride(
  requestedPickupDateTime: Date | null,
  requestedTravelDateTime: Date,
): boolean {
  return (
    requestedPickupDateTime !== null &&
    requestedPickupDateTime.getTime() !== requestedTravelDateTime.getTime()
  );
}

export function createRequestSummaryPreview(
  values: Record<string, string>,
  passengerCount: number,
  catalogs: {
    requestTypes: TripRequestTypeReference[];
    locations: TripLocationReference[];
  },
): TripRequestSummaryPreview {
  const requestType = catalogs.requestTypes.find(
    (type) => String(type.tripRequestTypeId) === values.tripRequestTypeId,
  );
  const locations = catalogs.locations.map((location) => ({
    id: String(location.locationId),
    name: location.locationName,
  }));
  const originId = sharesOrigin(requestType?.typeCode)
    ? values.commonOriginLocationId
    : values["passenger.0.originLocationId"];
  const destinationId = sharesDestination(requestType?.typeCode)
    ? values.commonDestinationLocationId
    : values["passenger.0.destinationLocationId"];

  return {
    requestTypeName: requestType?.typeName ?? null,
    purpose: optional(values.purpose),
    travelAt:
      jalaliWhen(values.requestedTravelDay, values.requestedTravelTime) || null,
    originName: displayName(locations, originId) || null,
    destinationName: displayName(locations, destinationId) || null,
    passengerCount,
  };
}
