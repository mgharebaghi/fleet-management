import { normalizePersianNumerals } from "../../../../shared/text/persian-text";
export function normalizeMeterValue(value: string | null): string | null {
  return value?.trim() ? normalizePersianNumerals(value.trim()).replace(/[٬,]/g, "").replace(/٫/g, ".") : null;
}
export function meterHundredths(value: string | null): bigint | null {
  if (value === null || !/^\d{1,16}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function sameMeterValue(first: string | null, second: string | null): boolean {
  if (first === null || second === null) return first === second;
  const a = meterHundredths(first), b = meterHundredths(second);
  return a !== null && b !== null && a === b;
}
