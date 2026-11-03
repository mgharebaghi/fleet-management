import { describe, expect, it } from "vitest";
import type { StockBalance } from "./stock-records";
import { stockWarnings } from "./stock-warnings";
const row: StockBalance = { warehouseId: 1, warehouseCode: "W", warehouseName: "Warehouse", warehouseActive: true, partId: 1, partCode: "P", partName: "Part", partActive: true, unitName: "Item", balance: "1.00", totalBalance: "12.00", minStock: "5.00", maxStock: "20.00", reorderPoint: "10.00" };
describe("part-wide stock thresholds", () => {
  it("uses the total across warehouses rather than the local balance", () => { expect(stockWarnings(row)).toEqual(["normal"]); });
  it("can report minimum and reorder warnings together", () => { expect(stockWarnings({ ...row, totalBalance: "3.00" })).toEqual(["minimum", "reorder"]); });
  it("reports excessive stock, unknown balances and absent thresholds explicitly", () => {
    expect(stockWarnings({ ...row, totalBalance: "20.01" })).toEqual(["maximum"]);
    expect(stockWarnings({ ...row, totalBalance: null })).toEqual(["unknown"]);
    expect(stockWarnings({ ...row, minStock: null, maxStock: null, reorderPoint: null })).toEqual(["unconfigured"]);
  });
});
