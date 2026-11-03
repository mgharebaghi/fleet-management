export const requestStatuses = ["Open", "InProgress", "Completed", "Cancelled"] as const;
export type RequestStatus = typeof requestStatuses[number];
export type MaintenanceRequestInput = {
  id: number | null; vehicleId: number; maintenanceTypeId: number;
  problem: string | null; reportedOdometer: string | null; reportedEngineHours: string | null;
  priority: string | null; description: string | null;
};
export type RequestVehicle = {
  id: number; code: string; modelName: string; brandName: string; isActive: boolean;
  plateNoLeftSide: string; plateNoCenterChar: string | null; plateNoRightSide: string | null; plateNoIranNo: string | null;
};
export type RequestType = { id: number; code: string; name: string; isActive: boolean };
export type RequestOrder = { id: number; number: string; status: string; startedAt: string | null; endedAt: string | null; diagnosis: string | null; finalDescription: string | null; taskCount: number; completedTaskCount: number; partCount: number; workshopName: string | null; taskTimes: Array<{ status: string; hours: string | null }> };
export type MaintenanceRequest = Omit<MaintenanceRequestInput, "id" | "vehicleId" | "maintenanceTypeId"> & {
  id: number; vehicle: RequestVehicle; type: RequestType; status: string; requestedAt: string; orderCount: number; orderStatuses: string[];
};
export type MaintenanceRequestRecord = MaintenanceRequest & { orders: RequestOrder[] };
export type RequestReferences = { vehicles: RequestVehicle[]; types: RequestType[] };
export type RequestSearch = { search: string; status: string; vehicleId: number | null; maintenanceTypeId: number | null; page: number };
export type RequestFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof MaintenanceRequestInput | "status", "REQUIRED" | "INVALID" | "TOO_LONG">> }
  | { type: "NOT_FOUND" | "VEHICLE_UNAVAILABLE" | "TYPE_UNAVAILABLE" | "REQUEST_CLOSED" | "ORIGIN_FIXED" | "ORDERS_UNRESOLVED" | "REQUEST_IN_USE" | "INVALID_TRANSITION" | "UNKNOWN_STATUS" };
export type RequestResult = { success: true; id: number } | { success: false; error: RequestFailure };
export const requestIsEditable = (status: string) => status === "Open" || status === "InProgress";
