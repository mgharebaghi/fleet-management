import { normalizePersianSearchText } from "../../../../shared/text/persian-text";
import type { StockRepository } from "./stock-repository";
import { stockMovementTypes, type StockFailure, type StockMovementInput, type StockSearch, type StockWriteResult } from "./stock-records";
import { decreasesStock, normalizeStockDecimal, stockMinorUnits, validStockDecimal } from "./stock-quantity";

const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2147483647;
export class ManageStock {
  constructor(private readonly repository: StockRepository) {}
  references() { return this.repository.references(); }
  movements(criteria: StockSearch) { return this.repository.movements(normalizeStockSearch(criteria)); }
  balances(criteria: StockSearch) { return this.repository.balances(normalizeStockSearch(criteria)); }
  async append(input: StockMovementInput): Promise<StockWriteResult> {
    const value = { ...input, quantity: normalizeStockDecimal(input.quantity), unitPrice: input.unitPrice?.trim() ? normalizeStockDecimal(input.unitPrice) : null, description: input.description?.trim() || null };
    const fields: Extract<StockFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (!validId(value.warehouseId)) fields.warehouseId = "REQUIRED";
    if (!validId(value.partId)) fields.partId = "REQUIRED";
    if (!stockMovementTypes.includes(value.type as typeof stockMovementTypes[number])) fields.type = "INVALID";
    if (!validStockDecimal(value.quantity) || stockMinorUnits(value.quantity) <= BigInt(0)) fields.quantity = "INVALID";
    if (value.unitPrice !== null && !validStockDecimal(value.unitPrice)) fields.unitPrice = "INVALID";
    if ((value.description?.length ?? 0) > 500) fields.description = "TOO_LONG";
    if (value.type.startsWith("Adjustment") && !value.description) fields.description = "REQUIRED";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(value.warehouseId, value.partId, async session => {
      if (!await session.referencesActive(value.warehouseId, value.partId)) return { success: false, error: { type: "REFERENCE_UNAVAILABLE" } };
      const snapshot = await session.snapshot(value.warehouseId, value.partId);
      if (snapshot.balance === null || stockMinorUnits(snapshot.balance) < BigInt(0)) return { success: false, error: { type: "INVALID_LEDGER" } };
      if (value.type === "Opening" && snapshot.count > 0) return { success: false, error: { type: "OPENING_EXISTS" } };
      if (decreasesStock(value.type) && stockMinorUnits(value.quantity) > stockMinorUnits(snapshot.balance)) return { success: false, error: { type: "INSUFFICIENT_STOCK" } };
      return { success: true, id: await session.append(value) };
    });
  }
}

export function normalizeStockSearch(criteria: StockSearch): StockSearch {
  return { ...criteria, search: normalizePersianSearchText(criteria.search.trim()), warehouseId: criteria.warehouseId !== null && validId(criteria.warehouseId) ? criteria.warehouseId : null, partId: criteria.partId !== null && validId(criteria.partId) ? criteria.partId : null,
    type: stockMovementTypes.includes(criteria.type as typeof stockMovementTypes[number]) ? criteria.type : "",
    from: validDay(criteria.from) ? criteria.from : "", to: validDay(criteria.to) ? criteria.to : "", page: Number.isSafeInteger(criteria.page) && criteria.page > 0 ? Math.min(criteria.page, 1000000) : 1 };
}

function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
