import type { ServicePlan, ServicePlanDue, ServiceCriterion } from "./service-plan-records";
export function planHundredths(value: string | null): bigint | null {
  if (value === null || !/^\d{1,16}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split("."); return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
const decimal = (value: bigint) => `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
export function validPlanDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "0001-01-01" && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function servicePlanDue(plan: Pick<ServicePlan, "isActive" | "today" | "intervalKm" | "intervalDays" | "intervalHours" | "warningKm" | "warningDays" | "warningHours" | "lastOdometer" | "lastDate" | "lastHours" | "currentOdometer" | "currentHours">): ServicePlanDue {
  const criteria: ServiceCriterion[] = [];
  for (const [key, interval, warning, last, current] of [["km", plan.intervalKm, plan.warningKm, plan.lastOdometer, plan.currentOdometer], ["hours", plan.intervalHours, plan.warningHours, plan.lastHours, plan.currentHours]] as const) {
    if (interval === null) continue;
    const row: ServiceCriterion = { key, interval, warning, last, current, next: null, status: "Unknown" };
    const span = planHundredths(interval), base = planHundredths(last), actual = planHundredths(current), warn = warning === null ? BigInt(0) : planHundredths(warning);
    if (span !== null && span > BigInt(0) && base !== null) {
      const target = base + span; row.next = decimal(target);
      if (actual !== null && actual >= base && warn !== null && warn < span) row.status = actual >= target ? "Due" : actual >= target - warn ? "Warning" : "Normal";
    }
    criteria.push(row);
  }
  if (plan.intervalDays !== null) {
    const row: ServiceCriterion = { key: "days", interval: plan.intervalDays, warning: plan.warningDays, last: plan.lastDate, current: plan.today, next: null, status: "Unknown" };
    const days = /^\d+$/.test(plan.intervalDays) ? Number(plan.intervalDays) : NaN;
    const warn = plan.warningDays === null ? 0 : /^\d+$/.test(plan.warningDays) ? Number(plan.warningDays) : NaN;
    if (Number.isInteger(days) && days > 0 && Number.isInteger(warn) && warn >= 0 && warn < days && plan.lastDate && validPlanDay(plan.lastDate) && validPlanDay(plan.today) && plan.today >= plan.lastDate) {
      const next = new Date(Date.parse(`${plan.lastDate}T00:00:00Z`) + days * 86400000);
      if (Number.isFinite(next.getTime()) && next.getUTCFullYear() <= 9999) {
        row.next = next.toISOString().slice(0, 10);
        const remaining = (next.getTime() - Date.parse(`${plan.today}T00:00:00Z`)) / 86400000;
        row.status = remaining <= 0 ? "Due" : remaining <= warn ? "Warning" : "Normal";
      }
    }
    criteria.push(row);
  }
  const status = !plan.isActive ? "Inactive" : criteria.some(row => row.status === "Due") ? "Due" : !criteria.length || criteria.some(row => row.status === "Unknown") ? "Unknown" : criteria.some(row => row.status === "Warning") ? "Warning" : "Normal";
  return { status, criteria };
}

export function validPlanWarning(interval: string | null, warning: string | null, days = false): boolean {
  if (!warning?.trim()) return true;
  const span = planHundredths(interval), warn = planHundredths(warning);
  return span !== null && span > BigInt(0) && warn !== null && warn < span && (!days || (/^\d+$/.test(interval ?? "") && /^\d+$/.test(warning)));
}
