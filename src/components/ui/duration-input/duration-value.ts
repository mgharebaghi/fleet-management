import { normalizePersianNumerals } from "../../../shared/text/persian-text";
export function durationParts(value: string): { hours: string; minutes: string; seconds: string } | null {
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(value)) return null;
  const [hours, fraction = ""] = value.split(".");
  const seconds = BigInt(fraction.padEnd(2, "0")) * BigInt(36);
  return { hours: String(BigInt(hours)), minutes: String(seconds / BigInt(60)).padStart(2, "0"), seconds: String(seconds % BigInt(60)).padStart(2, "0") };
}
export function formatDuration(value: string): string {
  const parts = durationParts(value);
  if (!parts) return value ? "مقدار نامعتبر" : "";
  return `${parts.hours.padStart(2, "0")}:${parts.minutes}${parts.seconds !== "00" ? `:${parts.seconds}` : ""}`;
}
export function decimalHoursFromParts(hourText: string, minuteText: string): { value: string; rounded: boolean } | null {
  const hours = normalizePersianNumerals(hourText).replace(/[,٬]/g, "").trim(), minutes = normalizePersianNumerals(minuteText).trim();
  if (!/^\d{1,16}$/.test(hours) || !/^\d{1,2}$/.test(minutes) || Number(minutes) > 59) return null;
  const minuteHundredths = BigInt(minutes) * BigInt(100);
  const hundredths = BigInt(hours) * BigInt(100) + (minuteHundredths + BigInt(30)) / BigInt(60);
  return { value: `${hundredths / BigInt(100)}.${String(hundredths % BigInt(100)).padStart(2, "0")}`, rounded: minuteHundredths % BigInt(60) !== BigInt(0) };
}
