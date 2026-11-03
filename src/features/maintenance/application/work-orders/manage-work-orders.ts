import { normalizePersianNumerals, normalizePersianSearchText } from "../../../../shared/text/persian-text";
import { jalaliYearOf } from "../../../../shared/date/jalali-year";
import { nextWorkOrderNumber } from "./work-order-number";
import { workOrderIsEditable, workOrderStatuses, type CreateWorkOrderInput, type WorkOrderDetailsInput, type WorkOrderFailure, type WorkOrderResult, type WorkOrderSearch, type WorkOrderOrigin, type WorkLocation } from "./work-order-records";
import type { WorkOrderRepository, WorkOrderWriteSession } from "./work-order-repository";
const validId = (id: number, maximum = 2147483647) => Number.isInteger(id) && id > 0 && id <= maximum;
const optional = (text: string | null) => text?.trim() || null;
const reading = (value: string | null) => optional(value) === null ? null : normalizePersianNumerals(value!.trim()).replace(/٫/g, ".");
type Fields = Extract<WorkOrderFailure, { type: "VALIDATION_ERROR" }>["fields"];
function details(input: WorkOrderDetailsInput): { value: WorkOrderDetailsInput; fields: Fields } {
  const value = { ...input, problem: optional(input.problem), diagnosis: optional(input.diagnosis), description: optional(input.description), odometer: reading(input.odometer), engineHours: reading(input.engineHours) };
  const fields: Fields = {};
  if (value.workLocation !== "Workshop" && value.workLocation !== "OnSite") fields.workLocation = "INVALID";
  if (value.workshopId !== null && !validId(value.workshopId)) fields.workshopId = "INVALID";
  if (value.workLocation === "Workshop" && value.workshopId === null) fields.workshopId = "REQUIRED";
  for (const field of ["odometer", "engineHours"] as const) {
    const text = value[field];
    if (text !== null && (!/^\d+(\.\d{1,2})?$/.test(text) || text.split(".")[0].replace(/^0+/, "").length > 16)) fields[field] = "INVALID";
  }
  return { value, fields };
}
async function workshopAvailable(session: WorkOrderWriteSession, id: number | null, retainedId?: number | null) {
  if (id === null) return true;
  const workshop = await session.workshop(id);
  return !!workshop && (workshop.isActive || retainedId === workshop.id);
}
export function normalizeWorkOrderSearch(search: WorkOrderSearch): WorkOrderSearch {
  return { search: normalizePersianSearchText(search.search.trim()), status: workOrderStatuses.includes(search.status as typeof workOrderStatuses[number]) ? search.status : "", vehicleId: search.vehicleId !== null && validId(search.vehicleId) ? search.vehicleId : null, page: Number.isSafeInteger(search.page) && search.page > 0 ? Math.min(search.page, 1000000) : 1 };
}
export class ManageWorkOrders {
  constructor(private readonly repository: WorkOrderRepository, private readonly now: () => Date = () => new Date()) {}
  references() { return this.repository.references(); }
  get(id: number) { return validId(id) ? this.repository.get(id) : Promise.resolve(null); }
  list(search: WorkOrderSearch) { return this.repository.list(normalizeWorkOrderSearch(search)); }
  async create(input: CreateWorkOrderInput): Promise<WorkOrderResult> {
    const { value, fields } = details(input);
    if (!["Direct", "Request", "Plan"].includes(input.origin)) fields.origin = "INVALID";
    if (!validId(input.vehicleId)) fields.vehicleId = "REQUIRED";
    if (!validId(input.maintenanceTypeId, 255)) fields.maintenanceTypeId = "REQUIRED";
    if (input.origin === "Direct" ? input.sourceId !== null : input.sourceId === null || !validId(input.sourceId)) fields.sourceId = "INVALID";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    const year = jalaliYearOf(this.now());
    return this.repository.atomic({ year, ...(input.origin === "Request" ? { requestId: input.sourceId! } : input.origin === "Plan" ? { planId: input.sourceId! } : {}) }, async session => {
      if (input.origin !== "Direct") {
        const source = await session.source(input.origin as "Request" | "Plan", input.sourceId!);
        if (!source?.available) return { success: false, error: { type: "SOURCE_UNAVAILABLE" } };
        if (source.vehicleId !== input.vehicleId || source.maintenanceTypeId !== input.maintenanceTypeId) return { success: false, error: { type: "SOURCE_MISMATCH" } };
      }
      if (!(await session.vehicle(input.vehicleId))?.isActive) return { success: false, error: { type: "VEHICLE_UNAVAILABLE" } };
      if (!(await session.type(input.maintenanceTypeId))?.isActive) return { success: false, error: { type: "TYPE_UNAVAILABLE" } };
      if (!await workshopAvailable(session, value.workshopId)) return { success: false, error: { type: "WORKSHOP_UNAVAILABLE" } };
      const number = nextWorkOrderNumber(year, await session.numbers(year));
      if (!number) return { success: false, error: { type: "NUMBER_CAPACITY" } };
      return { success: true, id: await session.create({ ...value, vehicleId: input.vehicleId, maintenanceTypeId: input.maintenanceTypeId, origin: input.origin as WorkOrderOrigin, sourceId: input.sourceId, workLocation: value.workLocation as WorkLocation, number }) };
    });
  }
  async updateDetails(id: number, input: WorkOrderDetailsInput): Promise<WorkOrderResult> {
    const { value, fields } = details(input);
    if (!validId(id)) fields.id = "INVALID";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic({ orderId: id }, async session => {
      const existing = await session.order(id);
      if (!existing) return { success: false, error: { type: "NOT_FOUND" } };
      if (!workOrderStatuses.includes(existing.status as typeof workOrderStatuses[number]) || existing.origin === "Unknown") return { success: false, error: { type: "UNKNOWN_STATUS" } };
      if (!workOrderIsEditable(existing.status)) return { success: false, error: { type: "ORDER_CLOSED" } };
      if (!await workshopAvailable(session, value.workshopId, existing.workshopId)) return { success: false, error: { type: "WORKSHOP_UNAVAILABLE" } };
      await session.updateDetails(id, value);
      return { success: true, id };
    });
  }
}
