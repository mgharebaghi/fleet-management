import type { RequestVehicle, RequestType } from "../requests/maintenance-request-records";
export type WorkOrderVehicle = RequestVehicle;
export type WorkOrderType = RequestType;
export const workOrderStatuses = ["Open", "InProgress", "Completed", "Cancelled"] as const;
export type WorkOrderOrigin = "Direct" | "Request" | "Plan";
export type WorkLocation = "Workshop" | "OnSite";
export type WorkOrderWorkshop = { id: number; name: string; isActive: boolean };
export type WorkOrderSource = { id: number; vehicleId: number; maintenanceTypeId: number; title: string; available: boolean; problem: string | null; odometer: string | null; engineHours: string | null };
export type WorkOrderDetailsInput = {
  workLocation: string; workshopId: number | null; odometer: string | null; engineHours: string | null;
  problem: string | null; diagnosis: string | null; description: string | null;
};
export type CreateWorkOrderInput = WorkOrderDetailsInput & { origin: string; sourceId: number | null; vehicleId: number; maintenanceTypeId: number };
export type PreparedWorkOrder = Omit<CreateWorkOrderInput, "origin" | "workLocation"> & { origin: WorkOrderOrigin; workLocation: WorkLocation; number: string };
export type WorkOrderRecord = WorkOrderDetailsInput & {
  id: number; number: string; status: string; openedAt: string; startedAt: string | null; endedAt: string | null;
  origin: WorkOrderOrigin | "Unknown"; requestId: number | null; planId: number | null; sourceTitle: string | null;
  vehicle: WorkOrderVehicle; type: WorkOrderType; workshop: WorkOrderWorkshop | null;
  finalDescription: string | null;
};
export type WorkOrderReferences = { vehicles: WorkOrderVehicle[]; types: WorkOrderType[]; workshops: WorkOrderWorkshop[]; requests: WorkOrderSource[]; plans: WorkOrderSource[] };
export type WorkOrderSearch = { search: string; status: string; vehicleId: number | null; page: number };
export type WorkOrderFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof CreateWorkOrderInput | "id", "REQUIRED" | "INVALID">> }
  | { type: "NOT_FOUND" | "VEHICLE_UNAVAILABLE" | "TYPE_UNAVAILABLE" | "WORKSHOP_UNAVAILABLE" | "SOURCE_UNAVAILABLE" | "SOURCE_MISMATCH" | "ORDER_CLOSED" | "UNKNOWN_STATUS" | "NUMBER_CAPACITY" };
export type WorkOrderResult = { success: true; id: number } | { success: false; error: WorkOrderFailure };
export const workOrderIsEditable = (status: string) => status === "Open" || status === "InProgress";
