import { normalizePersianNumerals } from "../../../../shared/text/persian-text";

export function normalizeStockDecimal(value: string): string { return normalizePersianNumerals(value.trim()).replace(/٫/g, "."); }
export function validStockDecimal(value: string): boolean { return /^\d+(\.\d{1,2})?$/.test(value) && value.split(".")[0].replace(/^0+/, "").length <= 16; }
export function stockMinorUnits(value: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) throw new Error("Invalid exact stock decimal.");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  return (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"))) * (negative ? -BigInt(1) : BigInt(1));
}
export function stockDecimal(value: bigint): string {
  const absolute = value < BigInt(0) ? -value : value;
  return `${value < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}
export function decreasesStock(type: string): boolean { return type === "Issue" || type === "AdjustmentOut"; }
