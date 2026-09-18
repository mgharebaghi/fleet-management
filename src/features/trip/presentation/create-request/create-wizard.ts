import { formatGregorianDateAsJalali } from "../../../../components/ui/date-picker/jalali-date";
import type {
  TripLocationReference,
  TripPersonReference,
  TripRequestTypeReference,
} from "../../application/trip-records";
import { consecutiveFormIndexes } from "../trip-form-data";

export type CreateWizardStep = 1 | 2;

export const CREATE_WIZARD_STEPS = [
  { id: "request", label: "اطلاعات درخواست" },
  { id: "passengers", label: "مسافران" },
  { id: "review", label: "مرور و تأیید" },
] as const;

export const requestStepFieldLabels: Record<string, string> = {
  tripRequestTypeId: "نوع درخواست",
  requestDay: "تاریخ ثبت درخواست",
  requestTime: "ساعت ثبت",
  requestedTravelDay: "تاریخ برنامه‌ریزی‌شده",
  requestedTravelTime: "ساعت برنامه‌ریزی‌شده",
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

type LocationCatalogEntry = {
  locationId: number;
  isActive: boolean | null;
};

export type WizardErrorFocus = {
  step: CreateWizardStep;
  fields: string[];
};

function locationIdLooksInvalid(
  error: "LOCATION_NOT_FOUND" | "LOCATION_INACTIVE",
  id: string | undefined,
  locations: LocationCatalogEntry[],
) {
  if (!id) return false;
  const match = locations.find((item) => String(item.locationId) === id);
  if (error === "LOCATION_NOT_FOUND") return !match;
  return !match || match.isActive === false;
}

function wizardLocationCandidates(
  typeCode: string | undefined,
  values: Record<string, string> | undefined,
): { name: string; step: CreateWizardStep }[] {
  const candidates: { name: string; step: CreateWizardStep }[] = [];
  if (sharesOrigin(typeCode)) {
    candidates.push({ name: "commonOriginLocationId", step: 1 });
  }
  if (sharesDestination(typeCode)) {
    candidates.push({ name: "commonDestinationLocationId", step: 1 });
  }

  const indexes = consecutiveFormIndexes(
    values ?? {},
    (index) => `passenger.${index}.personId`,
  );
  const passengerIndexes = indexes.length > 0 ? indexes : [0];
  for (const index of passengerIndexes) {
    if (!sharesOrigin(typeCode)) {
      candidates.push({
        name: `passenger.${index}.originLocationId`,
        step: 2,
      });
    }
    if (!sharesDestination(typeCode)) {
      candidates.push({
        name: `passenger.${index}.destinationLocationId`,
        step: 2,
      });
    }
  }
  return candidates;
}

export function wizardLocationErrorFocus(
  error: string | undefined,
  values: Record<string, string> | undefined,
  typeCode: string | undefined,
  locations: LocationCatalogEntry[],
): WizardErrorFocus | null {
  if (error !== "LOCATION_NOT_FOUND" && error !== "LOCATION_INACTIVE") {
    return null;
  }

  const candidates = wizardLocationCandidates(typeCode, values);
  const suspicious = candidates.filter((candidate) =>
    locationIdLooksInvalid(error, values?.[candidate.name], locations),
  );
  const targets = suspicious.length > 0 ? suspicious : candidates;
  const step: CreateWizardStep = targets.some((target) => target.step === 1)
    ? 1
    : 2;
  const fields = [
    ...new Set([
      ...targets
        .filter((target) => target.step === step)
        .map((target) => target.name),
      ...suspicious.map((candidate) => candidate.name),
    ]),
  ];
  return { step, fields };
}

export function wizardErrorNavigation(
  error: string | undefined,
  field: string | undefined,
  values: Record<string, string> | undefined,
  typeCode: string | undefined,
  locations: LocationCatalogEntry[],
): WizardErrorFocus {
  return (
    wizardLocationErrorFocus(error, values, typeCode, locations) ?? {
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
  if (!values.requestDay) gaps.push("requestDay");
  if (!values.requestTime) gaps.push("requestTime");
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
  requestAt: string;
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
    requestAt: jalaliWhen(values.requestDay, values.requestTime),
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
