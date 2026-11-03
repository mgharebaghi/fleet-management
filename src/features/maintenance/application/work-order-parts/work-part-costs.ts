import type { WorkOrderPart } from "./work-order-part-records";
export function workPartCosts(items: readonly Pick<WorkOrderPart, "quantity" | "unitPrice" | "totalPrice">[]): { knownTotal: string; missingCount: number } | null {
  let total = BigInt(0), missingCount = 0;
  const hundredths = (value: string) => { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")); };
  for (const item of items) {
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(item.quantity) || hundredths(item.quantity) <= 0) return null;
    if (item.unitPrice === null) { if (item.totalPrice !== null) return null; missingCount++; continue; }
    if (!/^\d{1,16}(\.\d{1,2})?$/.test(item.unitPrice) || item.totalPrice === null || !/^\d{1,33}(\.\d{1,4})?$/.test(item.totalPrice)) return null;
    const [whole, fraction = ""] = item.totalPrice.split(".");
    const computed = BigInt(whole) * BigInt(10000) + BigInt(fraction.padEnd(4, "0"));
    if (computed !== hundredths(item.quantity) * hundredths(item.unitPrice)) return null;
    total += computed;
  }
  return { knownTotal: `${total / BigInt(10000)}.${String(total % BigInt(10000)).padStart(4, "0")}`, missingCount };
}
