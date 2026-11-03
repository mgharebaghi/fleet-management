import { expect, it } from "vitest";
import { workOrderCostSummary } from "./work-order-cost-summary";

it("adds two-place labor and four-place computed part totals without rounding", () => {
  expect(workOrderCostSummary([{ laborCost: "1000.01" }, { laborCost: "2.00" }], [{ quantity: "1.01", unitPrice: "2.03", totalPrice: "2.0503" }])).toEqual({
    labor: { count: 2, knownCount: 2, missingCount: 0, knownTotal: "1002.01", invalid: false },
    parts: { count: 1, knownCount: 1, missingCount: 0, knownTotal: "2.0503", invalid: false }, total: "1004.0603", status: "complete",
  });
});
it("keeps partial totals visibly incomplete across both sources", () => {
  const summary = workOrderCostSummary([{ laborCost: null }, { laborCost: "5.10" }], [{ quantity: "1", unitPrice: null, totalPrice: null }]);
  expect(summary).toMatchObject({ status: "incomplete", total: "5.1000", labor: { missingCount: 1 }, parts: { missingCount: 1, knownTotal: null } });
});
it("distinguishes no records, all unknown amounts and explicitly recorded zero", () => {
  expect(workOrderCostSummary([], [])).toMatchObject({ status: "empty", total: null });
  expect(workOrderCostSummary([{ laborCost: null }], [])).toMatchObject({ status: "incomplete", total: null, labor: { knownTotal: null }, parts: { count: 0 } });
  expect(workOrderCostSummary([{ laborCost: "0.00" }], [{ quantity: "1", unitPrice: "0", totalPrice: "0.0000" }])).toMatchObject({ status: "complete", total: "0.0000" });
});
it("retains all recorded labor and consumption regardless of operational cancellation", () => {
  const tasks = [{ laborCost: "12.34", status: "Cancelled" }, { laborCost: "1.00", status: "Completed" }];
  expect(workOrderCostSummary(tasks, [])).toMatchObject({ status: "complete", total: "13.3400" });
});
it("handles totals beyond JavaScript safe integers and SQL single-row monetary precision", () => {
  expect(workOrderCostSummary([{ laborCost: "9999999999999999.99" }, { laborCost: "9999999999999999.99" }], [{ quantity: "9999999999999999.99", unitPrice: "9999999999999999.99", totalPrice: "99999999999999999800000000000000.0001" }]).total).toBe("100000000000000019799999999999999.9801");
});
it("never presents an invalid source as a valid total, while retaining the other subtotal", () => {
  expect(workOrderCostSummary([{ laborCost: "invalid" }], [{ quantity: "1", unitPrice: "2", totalPrice: "2.0000" }])).toMatchObject({ status: "invalid", total: null, labor: { invalid: true, knownTotal: null }, parts: { invalid: false, knownTotal: "2.0000" } });
  expect(workOrderCostSummary([{ laborCost: "3" }], [{ quantity: "1", unitPrice: "2", totalPrice: "3.0000" }])).toMatchObject({ status: "invalid", total: null, labor: { knownTotal: "3.00" }, parts: { invalid: true } });
});
