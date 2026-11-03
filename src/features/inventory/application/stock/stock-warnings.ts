import type { StockBalance } from "./stock-records";
import { stockMinorUnits } from "./stock-quantity";
export function stockWarnings(row: StockBalance): string[] {
  if (row.totalBalance === null) return ["unknown"];
  const total = stockMinorUnits(row.totalBalance), warnings: string[] = [];
  if (row.minStock !== null && total < stockMinorUnits(row.minStock)) warnings.push("minimum");
  if (row.reorderPoint !== null && total <= stockMinorUnits(row.reorderPoint)) warnings.push("reorder");
  if (row.maxStock !== null && total > stockMinorUnits(row.maxStock)) warnings.push("maximum");
  return warnings.length ? warnings : [row.minStock === null && row.maxStock === null && row.reorderPoint === null ? "unconfigured" : "normal"];
}
