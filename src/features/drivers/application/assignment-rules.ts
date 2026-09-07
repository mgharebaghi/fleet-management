import type { License, NewAssignment, DriverFailure } from "./driver-records";

export function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime()) && value.getUTCFullYear() >= 1 && value.getUTCFullYear() <= 9999;
}
export function validId(value: number): boolean { return Number.isInteger(value) && value > 0 && value <= 2147483647; }
export function localDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
export function validOdometer(value: string | null): boolean {
  return value === null || /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/.test(value);
}
function hundredths(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function odometerError(start: string | null, end: string | null): DriverFailure | null {
  if (!validOdometer(start) || !validOdometer(end)) return "INVALID_ODOMETER";
  return start !== null && end !== null && hundredths(end) < hundredths(start) ? "ODOMETER_DECREASE" : null;
}
export function assignmentError(input: NewAssignment): DriverFailure | null {
  if (!validId(input.driverId) || !validId(input.vehicleId)) return "INVALID_ID";
  if (!validDate(input.fromDateTime) || (input.toDateTime !== null && !validDate(input.toDateTime))) return "INVALID_DATE";
  if (input.toDateTime !== null && input.toDateTime <= input.fromDateTime) return "INVALID_PERIOD";
  if ((input.description?.length ?? 0) > 500) return "DESCRIPTION_TOO_LONG";
  return odometerError(input.startOdometer, input.endOdometer);
}
export function licenseEligible(license: License, at: Date): boolean {
  const day = localDay(at);
  return license.isActive && (license.issueDate === null || license.issueDate.toISOString().slice(0, 10) <= day) && (license.expireDate === null || license.expireDate.toISOString().slice(0, 10) >= day);
}
// Half-open intervals allow a handover at the exact end of the preceding assignment.
export function overlaps(a: Pick<NewAssignment, "fromDateTime" | "toDateTime">, b: Pick<NewAssignment, "fromDateTime" | "toDateTime">): boolean {
  return (b.toDateTime === null || a.fromDateTime < b.toDateTime) && (a.toDateTime === null || b.fromDateTime < a.toDateTime);
}
export function assignmentState(value: Pick<NewAssignment, "fromDateTime" | "toDateTime">, now: Date): "future" | "current" | "past" {
  if (value.fromDateTime > now) return "future";
  return value.toDateTime === null || now < value.toDateTime ? "current" : "past";
}
