import type { WorkOrderRecord } from "../work-orders/work-order-records";
import type { PreparedWorkOrderTask, WorkOrderTask, WorkTaskSnapshot, WorkTaskTechnician } from "./work-order-task-records";
export interface WorkOrderTaskSession {
  order(): Promise<WorkOrderRecord | null>;
  task(id: number): Promise<WorkOrderTask | null>;
  technician(id: number): Promise<WorkTaskTechnician | null>;
  save(input: PreparedWorkOrderTask): Promise<number>;
  cancel(id: number): Promise<void>;
  fillCost(id: number, value: string): Promise<void>;
}
export interface WorkOrderTaskRepository {
  atomic<T>(orderId: number, work: (session: WorkOrderTaskSession) => Promise<T>): Promise<T>;
  snapshot(orderId: number): Promise<WorkTaskSnapshot | null>;
}
