const tehran = "Asia/Tehran";

const listWeekdayDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: tehran,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const listTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: tehran,
  hour: "2-digit",
  minute: "2-digit",
});

const listShortDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: tehran,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const passengerCountFormatter = new Intl.NumberFormat("fa-IR");

export type TripListScheduleParts = {
  travelDayLabel: string;
  travelTimeLabel: string;
  shortDateLabel: string;
};

export function formatTripListSchedule(value: Date): TripListScheduleParts {
  const travelTimeLabel = listTimeFormatter.format(value);
  return {
    travelDayLabel: listWeekdayDateFormatter.format(value),
    travelTimeLabel: `ساعت ${travelTimeLabel}`,
    shortDateLabel: listShortDateFormatter.format(value),
  };
}

export function formatTripListPassengerCount(count: number): string {
  return `${passengerCountFormatter.format(count)} مسافر`;
}

export function tripListPurposeOrTypeLine(
  purpose: string | null,
  requestTypeName: string,
): string {
  const headline = purpose?.trim() ? purpose.trim() : requestTypeName;
  return headline;
}
