import { requestRepairFilters } from "./request-repair-stage";
import { normalizePersianNumerals, normalizePersianSearchText } from "../../../../shared/text/persian-text";
import { requestIsEditable, requestStatuses, type MaintenanceRequestInput, type RequestFailure, type RequestResult, type RequestSearch, type RequestStatus } from "./maintenance-request-records";
import type { MaintenanceRequestRepository } from "./maintenance-request-repository";
const validId = (id: number, maximum = 2147483647) => Number.isInteger(id) && id > 0 && id <= maximum;
const optional = (value: string | null) => value?.trim() || null;
function reading(value: string | null): string | null { return optional(value) === null ? null : normalizePersianNumerals(value!.trim()).replace(/٫/g, "."); }
const validReading = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && value.split(".")[0].replace(/^0+/, "").length <= 16;
export function normalizeRequestSearch(value: RequestSearch): RequestSearch {
  return { search: normalizePersianSearchText(value.search.trim()), status: [...requestStatuses, ...requestRepairFilters].some(status => status === value.status) ? value.status : "", vehicleId: value.vehicleId !== null && validId(value.vehicleId) ? value.vehicleId : null, maintenanceTypeId: value.maintenanceTypeId !== null && validId(value.maintenanceTypeId, 255) ? value.maintenanceTypeId : null, page: Number.isSafeInteger(value.page) && value.page > 0 ? Math.min(value.page, 1000000) : 1 };
}
export class ManageMaintenanceRequests {
  constructor(private readonly repository: MaintenanceRequestRepository) {}
  references() { return this.repository.references(); }
  get(id: number) { return validId(id) ? this.repository.get(id) : Promise.resolve(null); }
  list(search: RequestSearch) { return this.repository.list(normalizeRequestSearch(search)); }
  async remove(id: number): Promise<RequestResult> {
    if (!validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID" } } };
    return this.repository.atomic(id, async session => {
      const request = await session.request(id);
      if (!request) return { success: false, error: { type: "NOT_FOUND" } };
      if (!requestStatuses.includes(request.status as RequestStatus)) return { success: false, error: { type: "UNKNOWN_STATUS" } };
      if (request.orders.length || request.orderCount) return { success: false, error: { type: "REQUEST_IN_USE" } };
      if (!await session.remove(id)) return { success: false, error: { type: "REQUEST_IN_USE" } };
      return { success: true, id };
    });
  }
  async save(input: MaintenanceRequestInput): Promise<RequestResult> {
    const value = { ...input, problem: optional(input.problem), priority: optional(input.priority), description: optional(input.description), reportedOdometer: reading(input.reportedOdometer), reportedEngineHours: reading(input.reportedEngineHours) };
    const fields: Extract<RequestFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (value.id !== null && !validId(value.id)) fields.id = "INVALID";
    if (!validId(value.vehicleId)) fields.vehicleId = "REQUIRED";
    if (!validId(value.maintenanceTypeId, 255)) fields.maintenanceTypeId = "REQUIRED";
    for (const [field, maximum] of [["problem", 1000], ["description", 1000], ["priority", 50]] as const) if ((value[field]?.length ?? 0) > maximum) fields[field] = "TOO_LONG";
    for (const field of ["reportedOdometer", "reportedEngineHours"] as const) if (value[field] !== null && !validReading(value[field])) fields[field] = "INVALID";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(value.id, async session => {
      const existing = value.id === null ? null : await session.request(value.id);
      if (value.id !== null && !existing) return { success: false, error: { type: "NOT_FOUND" } };
      if (existing && !requestStatuses.includes(existing.status as RequestStatus)) return { success: false, error: { type: "UNKNOWN_STATUS" } };
      if (existing && !requestIsEditable(existing.status)) return { success: false, error: { type: "REQUEST_CLOSED" } };
      if (existing && (existing.orderCount > 0 || existing.orders.length > 0)) return { success: false, error: { type: "REQUEST_IN_USE" } };
      const vehicle = await session.vehicle(value.vehicleId);
      if (!vehicle || (!vehicle.isActive && existing?.vehicle.id !== vehicle.id)) return { success: false, error: { type: "VEHICLE_UNAVAILABLE" } };
      const type = await session.type(value.maintenanceTypeId);
      if (!type || (!type.isActive && existing?.type.id !== type.id)) return { success: false, error: { type: "TYPE_UNAVAILABLE" } };
      return { success: true, id: await session.save(value) };
    });
  }
  async changeStatus(id: number, status: string): Promise<RequestResult> {
    const fields: Extract<RequestFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    if (!validId(id)) fields.id = "INVALID";
    if (!requestStatuses.includes(status as RequestStatus)) fields.status = "INVALID";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(id, async session => {
      const request = await session.request(id);
      if (!request) return { success: false, error: { type: "NOT_FOUND" } };
      if (!requestStatuses.includes(request.status as RequestStatus)) return { success: false, error: { type: "UNKNOWN_STATUS" } };
      if (!requestIsEditable(request.status)) return { success: false, error: { type: "REQUEST_CLOSED" } };
      if (request.orderCount > 0 || request.orders.length > 0) return { success: false, error: { type: "REQUEST_IN_USE" } };
      if (status === "Open" || status === request.status) return { success: false, error: { type: "INVALID_TRANSITION" } };
      if ((status === "Completed" || status === "Cancelled") && request.orders.some(order => order.status !== "Completed" && order.status !== "Cancelled")) return { success: false, error: { type: "ORDERS_UNRESOLVED" } };
      await session.changeStatus(id, status as RequestStatus);
      return { success: true, id };
    });
  }
}
