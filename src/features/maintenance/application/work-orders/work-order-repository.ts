import type { WorkOrderCompletionContext, WorkOrderCompletionWrite } from "./work-order-completion-records";
import type { PreparedWorkOrder, WorkOrderDetailsInput, WorkOrderRecord, WorkOrderReferences, WorkOrderSearch, WorkOrderSource, WorkOrderType, WorkOrderVehicle, WorkOrderWorkshop } from "./work-order-records";
import type { WorkOrderStartReadiness } from "./work-order-start-records";
export interface WorkOrderWriteSession {
  completionContext(vehicleId: number, planId: number | null): Promise<WorkOrderCompletionContext>;
  completeOrder(id: number, value: WorkOrderCompletionWrite): Promise<void>;
  startReadiness(vehicleId: number, orderId: number): Promise<WorkOrderStartReadiness>;
  startOrder(id: number): Promise<void>;
  order(id: number): Promise<WorkOrderRecord | null>;
  vehicle(id: number): Promise<WorkOrderVehicle | null>;
  type(id: number): Promise<WorkOrderType | null>;
  workshop(id: number): Promise<WorkOrderWorkshop | null>;
  source(kind: "Request" | "Plan", id: number): Promise<WorkOrderSource | null>;
  numbers(year: number): Promise<string[]>;
  create(input: PreparedWorkOrder): Promise<number>;
  updateDetails(id: number, input: WorkOrderDetailsInput): Promise<void>;
  taskStates(id: number): Promise<Array<{ id: number; status: string }>>;
  cancelOrder(id: number, value: { reason: string | null; started: boolean; unfinishedTaskIds: number[] }): Promise<void>;
}
export interface WorkOrderRepository {
  atomic<T>(locks: { vehicleId?: number; orderId?: number; year?: number; requestId?: number; planId?: number }, work: (session: WorkOrderWriteSession) => Promise<T>): Promise<T>;
  get(id: number): Promise<WorkOrderRecord | null>;
  list(search: WorkOrderSearch): Promise<{ rows: WorkOrderRecord[]; totalCount: number }>;
  references(): Promise<WorkOrderReferences>;
}
