import type { License } from "../application/driver-records";

/** Thirty days is a feature-local visual convention, not a license rule. */
export const LICENSE_EXPIRY_WARNING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type LicenseExpiryStatus = {
  tone: "positive" | "warning" | "negative" | "info";
  label: string;
  /** Fraction of issue-to-expiry elapsed, 0 to 1. Null when either bound is unset. */
  progress: number | null;
};

function elapsedFraction(issueDate: Date, expireDate: Date, now: Date): number {
  const total = expireDate.getTime() - issueDate.getTime();
  return total <= 0 ? 1 : (now.getTime() - issueDate.getTime()) / total;
}

/** Health of a license's validity window, independent of the record's own IsActive flag. */
export function getLicenseExpiryStatus(license: Pick<License, "issueDate" | "expireDate">, now: Date): LicenseExpiryStatus {
  const { issueDate, expireDate } = license;
  if (issueDate !== null && issueDate > now) return { tone: "info", label: "هنوز صادر نشده", progress: 0 };
  if (expireDate === null) return { tone: "positive", label: "بدون تاریخ انقضا", progress: issueDate === null ? null : 0 };
  if (expireDate <= now) return { tone: "negative", label: "منقضی", progress: 1 };
  const progress = issueDate === null ? null : elapsedFraction(issueDate, expireDate, now);
  const nearExpiry = expireDate.getTime() - now.getTime() <= LICENSE_EXPIRY_WARNING_WINDOW_MS;
  return nearExpiry ? { tone: "warning", label: "نزدیک انقضا", progress } : { tone: "positive", label: "معتبر", progress };
}
