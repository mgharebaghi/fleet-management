import { normalizePersianNumerals, normalizePersianSearchText } from "../../../../shared/text/persian-text";
import { planHundredths, servicePlanDue, validPlanDay, validPlanWarning } from "./service-plan-due";
import type { ServicePlanRepository } from "./service-plan-repository";
import type { ServicePlanInput, ServicePlanFailure, ServicePlanResult, ServicePlanSearch } from "./service-plan-records";
const sameDecimal = (a: string | null, b: string | null) => a === null || b === null ? a === b : planHundredths(a) !== null && planHundredths(a) === planHundredths(b);
const validId = (id: number, maximum = 2147483647) => Number.isInteger(id) && id > 0 && id <= maximum;
const numeric = (value: string | null) => value?.trim() ? normalizePersianNumerals(value.trim()).replace(/[٬,]/g, "").replace(/٫/g, ".") : null;
export class ManageServicePlans {
  constructor(private readonly repository: ServicePlanRepository) {}
  references() { return this.repository.references(); }
  async get(id: number) { const plan = validId(id) ? await this.repository.get(id) : null; return plan ? { plan, due: servicePlanDue(plan), orders: await this.repository.orders(id) } : null; }
  async list(search: ServicePlanSearch) {
    const candidates = await this.repository.candidates(normalizePersianSearchText(search.search.trim()), search.vehicleId !== null && validId(search.vehicleId) ? search.vehicleId : null);
    const rows = candidates.map(plan => ({ plan, due: servicePlanDue(plan) })).filter(row => !search.status || row.due.status === search.status);
    const page = Number.isSafeInteger(search.page) && search.page > 0 ? Math.min(search.page, 1000000) : 1;
    return { rows: rows.slice((page - 1) * 20, page * 20), totalCount: rows.length };
  }
  async remove(id: number): Promise<ServicePlanResult> {
    if (!validId(id)) return { success: false, error: { type: "NOT_FOUND" } };
    return this.repository.atomic(id, async session => {
      const existing = await session.get(id);
      if (!existing) return { success: false, error: { type: "NOT_FOUND" } };
      if (existing.orderCount || !await session.remove(id)) return { success: false, error: { type: "PLAN_IN_USE" } };
      return { success: true, id };
    });
  }
  async save(input: ServicePlanInput): Promise<ServicePlanResult> {
    const value = { ...input, title: input.title.trim(), description: input.description?.trim() || null };
    for (const field of ["intervalKm", "intervalDays", "intervalHours", "warningKm", "warningDays", "warningHours", "lastOdometer", "lastHours"] as const) value[field] = numeric(value[field]);
    value.lastDate = value.lastDate?.trim() || null;
    const fields: Extract<ServicePlanFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (value.id !== null && !validId(value.id)) fields.id = "INVALID";
    if (!validId(value.vehicleId)) fields.vehicleId = "REQUIRED";
    if (!validId(value.maintenanceTypeId, 255)) fields.maintenanceTypeId = "REQUIRED";
    if (!value.title) fields.title = "REQUIRED"; else if (value.title.length > 200) fields.title = "TOO_LONG";
    for (const field of ["intervalKm", "intervalHours", "warningKm", "warningHours", "lastOdometer", "lastHours"] as const) if (value[field] !== null && planHundredths(value[field]) === null) fields[field] = "INVALID";
    for (const field of ["intervalDays", "warningDays"] as const) if (value[field] !== null && (!/^\d+$/.test(value[field]) || Number(value[field]) > 2147483647)) fields[field] = "INVALID";
    for (const [interval, warning] of [["intervalKm", "warningKm"], ["intervalHours", "warningHours"], ["intervalDays", "warningDays"]] as const) {
      const span = planHundredths(value[interval]);
      if (value[interval] !== null && (span === null || span <= BigInt(0))) fields[interval] = "INVALID";
      if (!validPlanWarning(value[interval], value[warning], interval === "intervalDays")) fields[warning] = "INVALID";
    }
    if (value.lastDate !== null && !validPlanDay(value.lastDate)) fields.lastDate = "INVALID";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    if (!value.intervalKm && !value.intervalDays && !value.intervalHours) return { success: false, error: { type: "INTERVAL_REQUIRED" } };
    return this.repository.atomic(value.id, async session => {
      const existing = value.id === null ? null : await session.get(value.id);
      if (value.id !== null && !existing) return { success: false, error: { type: "NOT_FOUND" } };
      if (existing?.orderCount) {
        if (existing.vehicleId !== value.vehicleId || existing.maintenanceTypeId !== value.maintenanceTypeId) return { success: false, error: { type: "SOURCE_FIXED" } };
        if (existing.lastDate !== value.lastDate || !sameDecimal(existing.lastOdometer, value.lastOdometer) || !sameDecimal(existing.lastHours, value.lastHours)) return { success: false, error: { type: "BASELINE_LOCKED" } };
      }
      if (value.lastDate && value.lastDate > await session.today()) return { success: false, error: { type: "VALIDATION_ERROR", fields: { lastDate: "INVALID" } } };
      if (!await session.vehicleAvailable(value.vehicleId) && existing?.vehicleId !== value.vehicleId) return { success: false, error: { type: "VEHICLE_UNAVAILABLE" } };
      if (!await session.typeAvailable(value.maintenanceTypeId) && existing?.maintenanceTypeId !== value.maintenanceTypeId) return { success: false, error: { type: "TYPE_UNAVAILABLE" } };
      return { success: true, id: await session.save(value) };
    });
  }
}
