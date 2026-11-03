import type { RequestVehicle } from "./maintenance-request-records";
export interface MaintenanceRequestVehiclePort {
  vehicle(id: number): Promise<RequestVehicle | null>;
  options(): Promise<RequestVehicle[]>;
}
