import { planHundredths, validPlanDay } from "./service-plan-due";
import type { ServiceCriterion } from "./service-plan-records";

export function serviceCriterionProgress(row: ServiceCriterion): { percent: number; remaining: string } | null {
  if (row.status === "Unknown") return null;
  let elapsed: bigint, span: bigint;
  if (row.key === "days") {
    if (!row.last || !row.current || !validPlanDay(row.last) || !validPlanDay(row.current) || !/^\d+$/.test(row.interval)) return null;
    elapsed = BigInt(Math.round((Date.parse(row.current + "T00:00:00Z") - Date.parse(row.last + "T00:00:00Z")) / 86400000));
    span = BigInt(row.interval);
  } else {
    const last = planHundredths(row.last), current = planHundredths(row.current), interval = planHundredths(row.interval);
    if (last === null || current === null || interval === null) return null;
    elapsed = current - last; span = interval;
  }
  if (elapsed < BigInt(0) || span <= BigInt(0)) return null;
  const left = elapsed >= span ? BigInt(0) : span - elapsed;
  return { percent: elapsed >= span ? 100 : Number(elapsed * BigInt(10000) / span) / 100, remaining: row.key === "days" ? String(left) : String(left / BigInt(100)) + "." + String(left % BigInt(100)).padStart(2, "0") };
}
