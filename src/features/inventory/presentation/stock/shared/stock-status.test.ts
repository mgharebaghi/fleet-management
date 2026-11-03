import { describe, expect, it } from "vitest";
import type { StockBalance } from "../../../application/stock/stock-records";
import { stockBalanceStatuses, stockMovementStatus } from "./stock-status";

const balance: StockBalance = { warehouseId: 1, warehouseCode: "W1", warehouseName: "Warehouse", warehouseActive: true, partId: 1, partCode: "P1", partName: "Part", partActive: true, unitName: "Item", balance: "0.00", totalBalance: "0.00", minStock: "5.00", maxStock: "20.00", reorderPoint: "10.00" };

describe("stock status presentation", () => {
  it("replaces threshold warnings with a red unavailable status when this warehouse is empty", () => {
    expect(stockBalanceStatuses(balance)).toEqual([{ label: "عدم موجودی", tone: "negative" }]);
    expect(stockBalanceStatuses({ ...balance, totalBalance: "15.00" })).toEqual([{ label: "عدم موجودی", tone: "negative" }]);
    expect(stockBalanceStatuses({ ...balance, totalBalance: null })).toEqual([{ label: "عدم موجودی", tone: "negative" }]);
  });
  it("keeps unknown quantities distinct from zero and positive quantities subject to global thresholds", () => {
    expect(stockBalanceStatuses({ ...balance, balance: null })).toEqual([{ label: "قابل محاسبه نیست", tone: "negative" }]);
    expect(stockBalanceStatuses({ ...balance, balance: "1.00", totalBalance: "8.00" })).toEqual([{ label: "نیاز به تأمین", tone: "warning" }]);
    expect(stockBalanceStatuses({ ...balance, balance: "1.00", totalBalance: null })).toEqual([{ label: "قابل محاسبه نیست", tone: "negative" }]);
  });
  it("uses green for additions, red for deductions and blue for opening balances", () => {
    for (const type of ["Receipt", "Return", "AdjustmentIn"]) expect(stockMovementStatus(type).tone).toBe("positive");
    for (const type of ["Issue", "AdjustmentOut"]) expect(stockMovementStatus(type).tone).toBe("negative");
    expect(stockMovementStatus("Opening")).toEqual({ label: "موجودی اولیه", tone: "info" });
    expect(stockMovementStatus("External")).toEqual({ label: "نوع نامشخص: External", tone: "negative" });
  });
});
