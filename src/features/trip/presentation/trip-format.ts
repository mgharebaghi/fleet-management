const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  dateStyle: "medium",
  timeStyle: "short",
});

export function singleSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function formatTripDateTime(value: Date | null): string {
  return value ? dateTimeFormatter.format(value) : "ثبت نشده";
}

export function locationSummary(
  values: string[],
  multipleLabel: string,
): string {
  if (values.length === 0) return "ثبت نشده";
  return values.length === 1 ? values[0] : multipleLabel;
}
