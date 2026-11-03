import type { MaintenanceRequestInput, MaintenanceRequestRecord, MaintenanceRequest, RequestSearch, RequestType, RequestReferences, RequestStatus } from "./maintenance-request-records";
import type { MaintenanceRequestVehiclePort } from "./maintenance-request-vehicle-port";
export interface MaintenanceRequestWriteSession extends Pick<MaintenanceRequestVehiclePort, "vehicle"> {
  request(id: number): Promise<MaintenanceRequestRecord | null>;
  type(id: number): Promise<RequestType | null>;
  save(input: MaintenanceRequestInput): Promise<number>;
  changeStatus(id: number, status: RequestStatus): Promise<void>;
  remove(id: number): Promise<boolean>;
}
export interface MaintenanceRequestRepository {
  atomic<T>(id: number | null, work: (session: MaintenanceRequestWriteSession) => Promise<T>): Promise<T>;
  references(): Promise<RequestReferences>;
  get(id: number): Promise<MaintenanceRequestRecord | null>;
  list(search: RequestSearch): Promise<{ rows: MaintenanceRequest[]; totalCount: number }>;
}
