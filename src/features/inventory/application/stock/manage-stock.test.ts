import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageStock, normalizeStockSearch } from "./manage-stock";
import { stockDecimal, stockMinorUnits } from "./stock-quantity";
import type { StockMovementInput } from "./stock-records";
const session = { referencesActive: vi.fn(), snapshot: vi.fn(), append: vi.fn() };
const repository = { atomic: vi.fn(), references: vi.fn(), movements: vi.fn(), balances: vi.fn() };
const manage = new ManageStock(repository);
const input: StockMovementInput = { warehouseId: 1, partId: 2, type: "Receipt", quantity: "1", unitPrice: null, description: null };
beforeEach(() => { vi.resetAllMocks(); repository.atomic.mockImplementation((w, p, work) => work(session)); session.referencesActive.mockResolvedValue(true); session.snapshot.mockResolvedValue({ count: 0, balance: "0.00" }); session.append.mockResolvedValue("9007199254740993"); });
describe("stock posting rules", () => {
  it("preserves exact large decimal strings and bigint identifiers", async () => {
    expect(await manage.append({ ...input, quantity: " ۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹ ", unitPrice: "۰٫۰۱" })).toEqual({ success: true, id: "9007199254740993" });
    expect(session.append).toHaveBeenCalledWith(expect.objectContaining({ quantity: "9999999999999999.99", unitPrice: "0.01" }));
    expect(stockDecimal(stockMinorUnits("9999999999999999.99") + stockMinorUnits("0.01"))).toBe("10000000000000000.00");
  });
  it.each(["0", "-1", "0.001", "1e3", "NaN", "10000000000000000"])("rejects invalid quantity %s before opening a transaction", async quantity => {
    expect((await manage.append({ ...input, quantity })).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("checks IDs, types, price bounds and SQL description length", async () => {
    const result = await manage.append({ ...input, partId: 0, warehouseId: NaN, type: "Unknown", unitPrice: "-1", description: "x".repeat(501) });
    expect(result.success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it.each(["AdjustmentIn", "AdjustmentOut"])("requires an explanation for %s", async type => {
    expect(await manage.append({ ...input, type })).toMatchObject({ success: false, error: { type: "VALIDATION_ERROR", fields: { description: "REQUIRED" } } });
  });
  it("allows an independent return without inventing a mandatory source or explanation", async () => {
    expect((await manage.append({ ...input, type: "Return" })).success).toBe(true);
  });
  it("allows only the first opening and rejects inactive or missing references", async () => {
    session.snapshot.mockResolvedValue({ count: 1, balance: "10.00" });
    expect(await manage.append({ ...input, type: "Opening" })).toEqual({ success: false, error: { type: "OPENING_EXISTS" } });
    session.referencesActive.mockResolvedValue(false);
    expect(await manage.append(input)).toEqual({ success: false, error: { type: "REFERENCE_UNAVAILABLE" } });
    expect(session.append).not.toHaveBeenCalled();
  });
  it.each(["Issue", "AdjustmentOut"])("checks available quantity atomically for %s", async type => {
    session.snapshot.mockResolvedValue({ count: 1, balance: "1.01" });
    expect(await manage.append({ ...input, type, quantity: "1.02", description: "Correction" })).toEqual({ success: false, error: { type: "INSUFFICIENT_STOCK" } });
    expect((await manage.append({ ...input, type, quantity: "1.01", description: "Correction" })).success).toBe(true);
  });
  it.each([null, "-1.00"])("blocks a corrupt ledger (%s) without appending", async balance => {
    session.snapshot.mockResolvedValue({ count: 1, balance });
    expect(await manage.append(input)).toEqual({ success: false, error: { type: "INVALID_LEDGER" } }); expect(session.append).not.toHaveBeenCalled();
  });
  it("normalizes filters without allowing date or paging corruption", () => {
    expect(normalizeStockSearch({ search: " كد ۱۲ ", warehouseId: -1, partId: 2, type: "invalid", from: "2026-02-30", to: "2026-11-02", page: NaN })).toEqual({ search: "کد 12", warehouseId: null, partId: 2, type: "", from: "", to: "2026-11-02", page: 1 });
  });
});
