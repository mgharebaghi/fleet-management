import type { RequestVehicle, RequestType } from "../requests/maintenance-request-records";
export type ServicePlanInput = {
  id: number | null; vehicleId: number; maintenanceTypeId: number; title: string; description: string | null; isActive: boolean;
  intervalKm: string | null; intervalDays: string | null; intervalHours: string | null;
  warningKm: string | null; warningDays: string | null; warningHours: string | null;
  lastOdometer: string | null; lastDate: string | null; lastHours: string | null;
};
export type ServicePlan = Omit<ServicePlanInput, "id" | "intervalDays" | "warningDays"> & {
  id: number; intervalDays: string | null; warningDays: string | null; vehicle: RequestVehicle; type: RequestType;
  currentOdometer: string | null; currentHours: string | null; orderCount: number; today: string;
};
export type ServicePlanOrder = { id: number; number: string; status: string };
export type ServicePlanStatus = "Due" | "Warning" | "Normal" | "Unknown" | "Inactive";
export type ServiceCriterion = { key: "km" | "days" | "hours"; last: string | null; interval: string; warning: string | null; current: string | null; next: string | null; status: Exclude<ServicePlanStatus, "Inactive"> };
export type ServicePlanDue = { status: ServicePlanStatus; criteria: ServiceCriterion[] };
export type ServicePlanFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof ServicePlanInput, "REQUIRED" | "INVALID" | "TOO_LONG">> } | { type: "NOT_FOUND" | "VEHICLE_UNAVAILABLE" | "TYPE_UNAVAILABLE" | "SOURCE_FIXED" | "BASELINE_LOCKED" | "INTERVAL_REQUIRED" | "PLAN_IN_USE" };
export type ServicePlanResult = { success: true; id: number } | { success: false; error: ServicePlanFailure };
export type ServicePlanSearch = { search: string; status: string; vehicleId: number | null; page: number };
export type ServicePlanReferences = { vehicles: RequestVehicle[]; types: RequestType[] };
