export const TRIP_REQUEST_STATUSES = [
  "New",
  "Assigned",
  "InProgress",
  "Completed",
  "Cancelled",
] as const;

export type TripRequestStatus = (typeof TRIP_REQUEST_STATUSES)[number];

export const TRIP_EXECUTION_STATUSES = [
  "Planned",
  "InProgress",
  "Completed",
  "Cancelled",
] as const;

export type TripExecutionStatus = (typeof TRIP_EXECUTION_STATUSES)[number];

export function isTripRequestStatus(value: string): value is TripRequestStatus {
  return TRIP_REQUEST_STATUSES.includes(value as TripRequestStatus);
}

export function isTripExecutionStatus(
  value: string,
): value is TripExecutionStatus {
  return TRIP_EXECUTION_STATUSES.includes(value as TripExecutionStatus);
}

export function canTransitionTripRequest(
  current: TripRequestStatus,
  target: TripRequestStatus,
  hasStartedExecution: boolean,
): boolean {
  if (target === current) return true;
  if (target === "Cancelled") {
    return (
      !hasStartedExecution &&
      (current === "New" || current === "Assigned")
    );
  }
  return (
    (current === "New" && target === "Assigned") ||
    (current === "Assigned" && target === "InProgress") ||
    (current === "InProgress" && target === "Completed")
  );
}

export function canTransitionTripExecution(
  current: TripExecutionStatus,
  target: TripExecutionStatus,
  hasActualStart: boolean,
): boolean {
  if (target === current) return true;
  if (target === "Cancelled") {
    return !hasActualStart && current === "Planned";
  }
  return (
    (current === "Planned" && target === "InProgress") ||
    (current === "InProgress" && target === "Completed")
  );
}

export function jalaliYearOf(dateTime: Date): number {
  const yearPart = new Intl.DateTimeFormat(
    "en-US-u-ca-persian-nu-latn",
    {
      timeZone: "Asia/Tehran",
      year: "numeric",
    },
  )
    .formatToParts(dateTime)
    .find((part) => part.type === "year")?.value;
  const year = Number(yearPart);
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new Error("The request date has no supported Jalali year.");
  }
  return year;
}

export function nextTripRequestNo(
  jalaliYear: number,
  existingNumbers: readonly string[],
): string | null {
  const prefix = `TR-${jalaliYear.toString().padStart(4, "0")}-`;
  const sequence = existingNumbers.reduce((maximum, requestNo) => {
    const normalized = requestNo.trim().toUpperCase();
    if (!normalized.startsWith(prefix)) return maximum;
    const suffix = normalized.slice(prefix.length);
    return /^\d{4}$/.test(suffix)
      ? Math.max(maximum, Number(suffix))
      : maximum;
  }, 0);
  return sequence >= 9999
    ? null
    : `${prefix}${String(sequence + 1).padStart(4, "0")}`;
}
