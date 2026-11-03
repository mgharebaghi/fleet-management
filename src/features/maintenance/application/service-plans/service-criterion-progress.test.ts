import { expect, it } from "vitest";
import { servicePlanDue } from "./service-plan-due";
import { serviceCriterionProgress } from "./service-criterion-progress";
const plan = { isActive: true, today: "2026-11-03", intervalKm: "100", intervalDays: null, intervalHours: null, warningKm: null, warningDays: null, warningHours: null, lastOdometer: "100", lastDate: null, lastHours: null, currentOdometer: "150", currentHours: null };
it("tracks distance exactly and caps reached/overdue criteria without resetting them", () => {
  expect(serviceCriterionProgress(servicePlanDue(plan).criteria[0])).toEqual({ percent: 50, remaining: "50.00" });
  expect(serviceCriterionProgress(servicePlanDue({ ...plan, currentOdometer: "205" }).criteria[0])).toEqual({ percent: 100, remaining: "0.00" });
  expect(serviceCriterionProgress(servicePlanDue({ ...plan, lastOdometer: null }).criteria[0])).toBeNull();
});
it("tracks calendar days and accumulated engine hours using the same service baselines", () => {
  expect(serviceCriterionProgress(servicePlanDue({ ...plan, intervalKm: null, intervalDays: "4", lastDate: "2026-11-01" }).criteria[0])).toEqual({ percent: 50, remaining: "2" });
  expect(serviceCriterionProgress(servicePlanDue({ ...plan, intervalKm: null, intervalHours: "0.02", lastHours: "9999999999999999.97", currentHours: "9999999999999999.98" }).criteria[0])).toEqual({ percent: 50, remaining: "0.01" });
});
