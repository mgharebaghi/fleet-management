// A record can disappear or change between a check and the write that follows it.
export class CatalogEntryNotFoundError extends Error {
  constructor() {
    super("The catalog entry no longer exists.");
    this.name = "CatalogEntryNotFoundError";
  }
}

// Raised when a delete is rejected by a foreign key: another table still
// references this entry, so the database itself refuses to remove it.
export class CatalogEntryInUseError extends Error {
  constructor() {
    super("The catalog entry is referenced by other records.");
    this.name = "CatalogEntryInUseError";
  }
}

export type CatalogEntryChanges = {
  name: string;
  /** Omitted for catalogs (like VehicleStatus) that have no IsActive column. */
  isActive?: boolean;
};

export interface CatalogEntryWriter<TEntry> {
  /** `excludeId` lets a rename check uniqueness against every other row. */
  existsByName(name: string, excludeId?: number): Promise<boolean>;
  create(name: string): Promise<TEntry>;
  update(id: number, changes: CatalogEntryChanges): Promise<TEntry>;
  remove(id: number): Promise<void>;
}
