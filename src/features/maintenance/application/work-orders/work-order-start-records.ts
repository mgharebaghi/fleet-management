export type WorkOrderStartReadiness = { vehicleActive: boolean; otherRepair: boolean; activeTrip: boolean; plannedTrips: number; unknownState: boolean };
export type WorkOrderStartFailure = "INVALID_ID" | "NOT_FOUND" | "ORDER_CLOSED" | "ALREADY_STARTED" | "UNKNOWN_STATE" | "VEHICLE_INACTIVE" | "ANOTHER_REPAIR" | "ACTIVE_TRIP" | "PLANNED_TRIPS_REQUIRE_CONFIRMATION";
export type WorkOrderStartResult = { success: true; id: number } | { success: false; error: WorkOrderStartFailure; plannedTrips?: number };
