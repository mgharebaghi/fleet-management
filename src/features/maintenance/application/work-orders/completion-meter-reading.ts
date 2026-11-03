import type { CompletionReading } from "./work-order-completion-records";
export function completionMeterValue(value: string | null): bigint | null {
  if (value === null || !/^\d{1,16}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function validCompletionReading(readings: readonly CompletionReading[], id: number, endedAt: string): CompletionReading | null {
  const selected = readings.find(reading => reading.id === id);
  if (!selected || !Number.isFinite(Date.parse(selected.recordedAt)) || Date.parse(selected.recordedAt) > Date.parse(endedAt)) return null;
  let odometer: bigint | null = null, hours: bigint | null = null;
  const ordered = [...readings].sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.id - b.id);
  for (const reading of ordered) {
    if (!Number.isFinite(Date.parse(reading.recordedAt))) return null;
    if (Date.parse(reading.recordedAt) > Date.parse(selected.recordedAt) || (reading.recordedAt === selected.recordedAt && reading.id > selected.id)) break;
    const km = completionMeterValue(reading.odometer), hour = completionMeterValue(reading.engineHours);
    if ((reading.odometer !== null && km === null) || (reading.engineHours !== null && hour === null) || (km === null && hour === null)) return null;
    if ((km !== null && odometer !== null && km < odometer) || (hour !== null && hours !== null && hour < hours)) return null;
    if (km !== null) odometer = km;
    if (hour !== null) hours = hour;
  }
  return selected;
}
