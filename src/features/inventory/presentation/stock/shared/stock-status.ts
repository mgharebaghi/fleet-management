import type { StatusBadgeProps } from "../../../../../components/ui/status-badge/status-badge";
import type { StockBalance } from "../../../application/stock/stock-records";
import { stockMinorUnits } from "../../../application/stock/stock-quantity";
import { stockWarnings } from "../../../application/stock/stock-warnings";
import { stockTypeLabels } from "./stock-messages";

const warningLabels: Record<string, string> = { unknown: "قابل محاسبه نیست", minimum: "کمتر از حداقل", reorder: "نیاز به تأمین", maximum: "بیشتر از حداکثر", unconfigured: "حدی تعیین نشده", normal: "در محدوده" };

export function stockBalanceStatuses(row: StockBalance): StatusBadgeProps[] {
  if (row.balance === null) return [{ label: warningLabels.unknown, tone: "negative" }];
  if (stockMinorUnits(row.balance) === BigInt(0)) return [{ label: "عدم موجودی", tone: "negative" }];
  return stockWarnings(row).map(code => ({ label: warningLabels[code], tone: code === "unknown" ? "negative" : code === "normal" || code === "unconfigured" ? "info" : "warning" }));
}

export function stockMovementStatus(type: string): StatusBadgeProps {
  const tone = type === "Issue" || type === "AdjustmentOut" ? "negative"
    : type === "Receipt" || type === "Return" || type === "AdjustmentIn" ? "positive"
    : type === "Opening" ? "info" : "negative";
  return { label: stockTypeLabels[type] ?? `نوع نامشخص: ${type}`, tone };
}
