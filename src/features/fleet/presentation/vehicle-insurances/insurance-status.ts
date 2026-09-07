import type { VehicleInsuranceSummary } from "../../application/vehicle-insurances/vehicle-insurance";

/** Thirty days is a feature-local visual convention, not an insurance rule. */
export const INSURANCE_EXPIRY_WARNING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type InsuranceExpiryStatus = {
  tone: "positive" | "warning" | "negative" | "info";
  label: string;
  /** Fraction of start-to-expiry elapsed, 0 to 1. */
  progress: number;
};

/** Health of an insurance's coverage window, independent of the record's own IsActive flag. */
export function getInsuranceExpiryStatus(insurance: Pick<VehicleInsuranceSummary, "startDate" | "expireDate">, now: Date): InsuranceExpiryStatus {
  const { startDate, expireDate } = insurance;
  if (startDate > now) return { tone: "info", label: "هنوز شروع نشده", progress: 0 };
  if (expireDate <= now) return { tone: "negative", label: "منقضی", progress: 1 };
  const total = expireDate.getTime() - startDate.getTime();
  const progress = total <= 0 ? 1 : (now.getTime() - startDate.getTime()) / total;
  const nearExpiry = expireDate.getTime() - now.getTime() <= INSURANCE_EXPIRY_WARNING_WINDOW_MS;
  return nearExpiry ? { tone: "warning", label: "نزدیک انقضا", progress } : { tone: "positive", label: "معتبر", progress };
}
