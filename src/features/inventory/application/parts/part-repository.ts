import type { PartInput, PartRecord, PartSearch } from "./part-records";
export class PartInUseError extends Error {}
export interface PartWriteSession {
  hasReferences(id: number): Promise<boolean>;
  delete(id: number): Promise<void>;
  part(id: number): Promise<{ unitId: number; categoryId: number | null; isUsed: boolean } | null>;
  codeExists(code: string, excludingId: number | null): Promise<boolean>;
  unitExists(id: number): Promise<boolean>;
  category(id: number): Promise<{ isActive: boolean } | null>;
  save(input: PartInput): Promise<number>;
}
export interface PartRepository {
  atomic<T>(work: (session: PartWriteSession) => Promise<T>): Promise<T>;
  get(id: number): Promise<PartRecord | null>;
  list(criteria: PartSearch): Promise<{ parts: PartRecord[]; totalCount: number }>;
}
