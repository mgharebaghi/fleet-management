import { expect, it } from "vitest";
import { criterionExplanation } from "./service-plan-presentation";
import { servicePlanDue } from "../../application/service-plans/service-plan-due";
import { orderOriginBadge } from "../work-orders/shared/work-order-presentation";
it("explains the missing baseline and current reading without hiding known targets", () => {
  const plan = { isActive: true, today: "2026-11-03", intervalKm: "100", intervalDays: "30", intervalHours: "50", warningKm: null, warningDays: null, warningHours: null, lastOdometer: "100", lastDate: null, lastHours: null, currentOdometer: null, currentHours: null };
  const due = servicePlanDue(plan);
  expect(due.status).toBe("Unknown");
  expect(due.criteria[0].next).toBe("200.00");
  expect(due.criteria.map(criterionExplanation)).toEqual(["کیلومتر فعلی خودرو ثبت نشده", "ساعت کارکرد آخرین سرویس ثبت نشده", "تاریخ آخرین سرویس ثبت نشده"]);
  expect(criterionExplanation(servicePlanDue({ ...plan, intervalDays: null, intervalHours: null, currentOdometer: "200" }).criteria[0])).toBeNull();
});
it("uses distinct origin labels and colors without guessing a request's kind", () => {
  expect(orderOriginBadge({ origin: "Plan" })).toEqual({ label: "برنامهٔ سرویس", tone: "purple" });
  expect(orderOriginBadge({ origin: "Request" })).toEqual({ label: "درخواست تعمیر", tone: "info" });
  expect(orderOriginBadge({ origin: "Direct" })).toEqual({ label: "ثبت مستقیم", tone: "warning" });
});
