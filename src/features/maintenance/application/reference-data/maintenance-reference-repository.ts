import type { MaintenanceType, MaintenanceTypeListItem, Workshop, Technician, WorkshopRecord, SaveMaintenanceType, SaveWorkshop, SaveTechnician, ReferenceSearch, ReferencePage } from "./maintenance-reference-records";

export class MaintenanceTypeCapacityError extends Error {}
export class MaintenanceCodeConflictError extends Error {}
export class MaintenanceReferenceMissingError extends Error {}
export class MaintenanceTypeInUseError extends Error {}

export interface MaintenanceReferenceWriteSession {
  type(id: number): Promise<MaintenanceType | null>;
  typeIsUsed(id: number): Promise<boolean>;
  deleteType(id: number): Promise<void>;
  typeCodeExists(code: string, excludingId: number | null): Promise<boolean>;
  saveType(value: SaveMaintenanceType): Promise<MaintenanceType>;
  workshop(id: number): Promise<Workshop | null>;
  saveWorkshop(value: SaveWorkshop): Promise<Workshop>;
  technician(id: number): Promise<Technician | null>;
  saveTechnician(value: SaveTechnician): Promise<Technician>;
}
export interface MaintenanceReferenceRepository {
  atomic<T>(work: (session: MaintenanceReferenceWriteSession) => Promise<T>): Promise<T>;
  types(search: ReferenceSearch): Promise<ReferencePage<MaintenanceTypeListItem>>;
  type(id: number): Promise<MaintenanceType | null>;
  workshops(search: ReferenceSearch): Promise<ReferencePage<Workshop>>;
  workshop(id: number): Promise<WorkshopRecord | null>;
  workshopOptions(): Promise<Workshop[]>;
  technicians(search: ReferenceSearch): Promise<ReferencePage<Technician>>;
  technician(id: number): Promise<Technician | null>;
}
