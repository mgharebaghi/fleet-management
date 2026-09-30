import type { DriverFailure, DriverResult, NewLicense } from "./driver-records";
import { localDay, validDate, validId } from "./assignment-rules";

export const failure = (error: DriverFailure): DriverResult => ({ success: false, error });

export function normalizedLicense(input: NewLicense): NewLicense {
  return { ...input, licenseType: input.licenseType.trim(), licenseNo: input.licenseNo.trim() };
}

export function licenseError(value: NewLicense, now: Date): DriverFailure | null {
  if (!validId(value.driverId)) return "INVALID_ID";
  if (!value.licenseType) return "LICENSE_TYPE_REQUIRED";
  if (value.licenseType.length > 100) return "LICENSE_TYPE_TOO_LONG";
  if (!value.licenseNo) return "LICENSE_NO_REQUIRED";
  if (value.licenseNo.length > 50) return "LICENSE_NO_TOO_LONG";
  for (const date of [value.issueDate, value.expireDate]) {
    if (date !== null && (!validDate(date) || date.toISOString().slice(11) !== "00:00:00.000Z")) return "INVALID_DATE";
  }
  if (value.issueDate && value.issueDate.toISOString().slice(0, 10) > localDay(now)) return "ISSUE_IN_FUTURE";
  if (value.issueDate && value.expireDate && value.expireDate < value.issueDate) return "EXPIRY_BEFORE_ISSUE";
  return null;
}
