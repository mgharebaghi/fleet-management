import { expect, it } from "vitest";
import { repairDurationMilliseconds, repairTimeState } from "./repair-time-estimate";
it("uses exact hundredths of task hours and excludes cancelled work", () => {
  expect(repairDurationMilliseconds([{ status: "Completed", hours: "24.10" }, { status: "Open", hours: "23.90" }, { status: "Cancelled", hours: "10" }])).toBe(48 * 3600000);
  expect(repairDurationMilliseconds([{ status: "Open", hours: "0.01" }])).toBe(36000);
});
it("does not invent a complete estimate from missing, invalid or unknown tasks", () => {
  for (const tasks of [[], [{ status: "Open", hours: null }], [{ status: "Open", hours: "-1" }], [{ status: "External", hours: "2" }], [{ status: "Completed", hours: "0" }]]) expect(repairDurationMilliseconds(tasks)).toBeNull();
});
it("recomputes a 48-hour estimate from real time across refreshes and clamps overdue progress", () => {
  const start = "2026-11-01T10:00:00+03:30", duration = 48 * 3600000;
  const halfway = repairTimeState(start, duration, Date.parse(start) + duration / 2)!;
  expect(halfway).toMatchObject({ percent: 50, remaining: duration / 2, overdue: false });
  expect(repairTimeState(start, duration, Date.parse(start) + duration + 1000)).toMatchObject({ percent: 100, remaining: 0, overdue: true });
  expect(repairTimeState(start, duration, Date.parse(start) - 1000)?.percent).toBe(0);
  expect(repairTimeState("invalid", duration, Date.now())).toBeNull();
});
