export function nextWorkOrderNumber(year: number, existing: readonly string[]): string | null {
  const prefix = `WO-${String(year).padStart(4, "0")}-`;
  const maximum = existing.reduce((highest, number) => {
    const normalized = number.trim().toUpperCase();
    const suffix = normalized.startsWith(prefix) ? normalized.slice(prefix.length) : "";
    return /^\d{4}$/.test(suffix) ? Math.max(highest, Number(suffix)) : highest;
  }, 0);
  return maximum >= 9999 ? null : `${prefix}${String(maximum + 1).padStart(4, "0")}`;
}
