import type { StockBalance, StockMovement, StockMovementInput, StockReferences, StockSearch } from "./stock-records";

export interface StockWriteSession {
  referencesActive(warehouseId: number, partId: number): Promise<boolean>;
  snapshot(warehouseId: number, partId: number): Promise<{ count: number; balance: string | null }>;
  append(input: StockMovementInput): Promise<string>;
}
export interface StockRepository {
  atomic<T>(warehouseId: number, partId: number, work: (session: StockWriteSession) => Promise<T>): Promise<T>;
  references(): Promise<StockReferences>;
  movements(criteria: StockSearch): Promise<{ rows: StockMovement[]; totalCount: number }>;
  balances(criteria: StockSearch): Promise<{ rows: StockBalance[]; totalCount: number }>;
}
