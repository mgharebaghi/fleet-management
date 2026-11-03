import { expect, it } from "vitest";
import { requestRepairStage } from "./request-repair-stage";
it.each([
  [[], "Unlinked"], [["Open"], "Pending"], [["InProgress"], "InProgress"],
  [["Completed"], "Completed"], [["Cancelled"], "Cancelled"],
  [["Completed", "Open"], "Pending"], [["Completed", "InProgress"], "InProgress"],
  [["Completed", "Cancelled"], "Completed"], [["Cancelled", "Cancelled"], "Cancelled"],
  [["External", "Completed"], "Unknown"],
] as const)("derives %s as %s without writing request state", (statuses, expected) => {
  expect(requestRepairStage({ orderCount: statuses.length, orderStatuses: [...statuses] })).toBe(expected);
});
it("refuses incomplete state data", () => {
  expect(requestRepairStage({ orderCount: 1, orderStatuses: [] })).toBe("Unknown");
});
