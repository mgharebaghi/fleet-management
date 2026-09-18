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
