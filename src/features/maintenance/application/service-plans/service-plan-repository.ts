import type { ServicePlan, ServicePlanInput, ServicePlanOrder, ServicePlanReferences } from "./service-plan-records";
export interface ServicePlanWriteSession {
  get(id: number): Promise<ServicePlan | null>;
  vehicleAvailable(id: number): Promise<boolean>;
  typeAvailable(id: number): Promise<boolean>;
  today(): Promise<string>;
  remove(id: number): Promise<boolean>;
  save(value: ServicePlanInput): Promise<number>;
}
export interface ServicePlanRepository {
  atomic<T>(id: number | null, work: (session: ServicePlanWriteSession) => Promise<T>): Promise<T>;
  get(id: number): Promise<ServicePlan | null>;
  candidates(search: string, vehicleId: number | null): Promise<ServicePlan[]>;
  orders(id: number): Promise<ServicePlanOrder[]>;
  references(): Promise<ServicePlanReferences>;
}
