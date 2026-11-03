import type { WorkOrderRecord } from "../work-orders/work-order-records";
import type { ConsumablePart, SaveWorkOrderPart, WorkOrderPart, WorkPartSnapshot, WorkPartTask } from "./work-order-part-records";
export interface WorkPartCatalogReader {
  part(id: number): Promise<ConsumablePart | null>;
  options(): Promise<ConsumablePart[]>;
}
export interface WorkOrderPartSession {
  order(): Promise<WorkOrderRecord | null>;
  item(id: number): Promise<WorkOrderPart | null>;
  task(id: number): Promise<WorkPartTask | null>;
  catalog: WorkPartCatalogReader;
  save(value: SaveWorkOrderPart): Promise<number>;
  delete(id: number): Promise<void>;
  fillPrice(id: number, value: string): Promise<void>;
}
export interface WorkOrderPartRepository {
  atomic<T>(orderId: number, work: (session: WorkOrderPartSession) => Promise<T>): Promise<T>;
  snapshot(orderId: number): Promise<WorkPartSnapshot | null>;
}
