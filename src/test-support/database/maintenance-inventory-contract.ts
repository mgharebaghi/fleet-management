import { PrismaMssql } from "@prisma/adapter-mssql";

import { loadTestDatabaseConfig } from "./test-database-config";

export const MAINTENANCE_INVENTORY_CONTRACT_QUERY = `
SELECT s.name AS schemaName, t.name AS tableName
FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN ('maintenance', 'inventory') AND t.is_ms_shipped = 0;

SELECT s.name AS schemaName, t.name AS tableName, c.name AS columnName,
  ty.name AS sqlType, c.max_length AS maxLengthBytes, c.precision, c.scale,
  c.is_nullable AS nullable, c.is_identity AS isIdentity,
  CONVERT(varchar(100), ic.seed_value) AS identitySeed,
  CONVERT(varchar(100), ic.increment_value) AS identityIncrement,
  dc.definition AS defaultDefinition, cc.definition AS computedDefinition,
  cc.is_persisted AS persistedComputed, c.collation_name AS collationName
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.identity_columns ic
  ON ic.object_id = c.object_id AND ic.column_id = c.column_id
LEFT JOIN sys.default_constraints dc ON dc.object_id = c.default_object_id
LEFT JOIN sys.computed_columns cc
  ON cc.object_id = c.object_id AND cc.column_id = c.column_id
WHERE s.name IN ('maintenance', 'inventory') AND t.is_ms_shipped = 0;

SELECT s.name AS schemaName, t.name AS tableName, f.name AS constraintName,
  c.name AS columnName, rs.name AS referencedSchema,
  rt.name AS referencedTable, rc.name AS referencedColumn,
  fc.constraint_column_id AS ordinal,
  f.delete_referential_action_desc AS onDelete,
  f.update_referential_action_desc AS onUpdate,
  f.is_disabled AS disabled, f.is_not_trusted AS notTrusted
FROM sys.foreign_keys f
JOIN sys.tables t ON t.object_id = f.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.tables rt ON rt.object_id = f.referenced_object_id
JOIN sys.schemas rs ON rs.schema_id = rt.schema_id
JOIN sys.foreign_key_columns fc ON fc.constraint_object_id = f.object_id
JOIN sys.columns c
  ON c.object_id = fc.parent_object_id AND c.column_id = fc.parent_column_id
JOIN sys.columns rc
  ON rc.object_id = fc.referenced_object_id AND rc.column_id = fc.referenced_column_id
WHERE s.name IN ('maintenance', 'inventory');

SELECT s.name AS schemaName, t.name AS tableName, i.name AS indexName,
  i.is_unique AS isUnique, i.is_primary_key AS isPrimaryKey,
  i.is_unique_constraint AS isUniqueConstraint, i.type_desc AS indexType,
  i.filter_definition AS filterDefinition, i.is_disabled AS disabled,
  c.name AS columnName, ic.key_ordinal AS keyOrdinal,
  ic.is_descending_key AS descendingKey, ic.is_included_column AS includedColumn
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.indexes i ON i.object_id = t.object_id AND i.index_id > 0
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE s.name IN ('maintenance', 'inventory') AND t.is_ms_shipped = 0;

SELECT s.name AS schemaName, t.name AS tableName, c.name AS constraintName,
  c.definition, c.is_disabled AS disabled, c.is_not_trusted AS notTrusted
FROM sys.check_constraints c
JOIN sys.tables t ON t.object_id = c.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name IN ('maintenance', 'inventory');

SELECT s.name AS schemaName, o.name AS objectName, o.type_desc AS objectType,
  m.definition, tr.is_disabled AS disabledTrigger
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
LEFT JOIN sys.sql_modules m ON m.object_id = o.object_id
LEFT JOIN sys.triggers tr ON tr.object_id = o.object_id
WHERE s.name IN ('maintenance', 'inventory') AND o.is_ms_shipped = 0
  AND o.type IN ('P', 'V', 'TR', 'FN', 'IF', 'TF', 'SO', 'SN');
`;

type MetadataRow = Record<string, string | number | boolean | null>;

export type MaintenanceInventoryMetadata = {
  tables: MetadataRow[];
  columns: MetadataRow[];
  foreignKeys: MetadataRow[];
  indexes: MetadataRow[];
  checks: MetadataRow[];
  objects: MetadataRow[];
};

const metadataFields: Record<keyof MaintenanceInventoryMetadata, readonly string[]> = {
  tables: ["schemaName", "tableName"],
  columns: [
    "schemaName", "tableName", "columnName", "sqlType", "maxLengthBytes",
    "precision", "scale", "nullable", "isIdentity", "identitySeed",
    "identityIncrement", "defaultDefinition", "computedDefinition", "persistedComputed", "collationName",
  ],
  foreignKeys: [
    "schemaName", "tableName", "columnName", "referencedSchema", "referencedTable",
    "referencedColumn", "ordinal", "onDelete", "onUpdate", "disabled", "notTrusted",
  ],
  indexes: [
    "schemaName", "tableName", "isUnique", "isPrimaryKey", "isUniqueConstraint",
    "indexType", "filterDefinition", "disabled", "columnName", "keyOrdinal",
    "descendingKey", "includedColumn",
  ],
  checks: ["schemaName", "tableName", "definition", "disabled", "notTrusted"],
  objects: ["schemaName", "objectName", "objectType", "definition", "disabledTrigger"],
};

/** Generated constraint names differ between restored databases; their contracts must not. */
export function normalizeMaintenanceInventoryMetadata(metadata: MaintenanceInventoryMetadata) {
  const normalized = {} as MaintenanceInventoryMetadata;
  for (const section of Object.keys(metadataFields) as Array<keyof MaintenanceInventoryMetadata>) {
    normalized[section] = metadata[section]
      .filter(row => row.schemaName === "maintenance" || row.schemaName === "inventory")
      .map(row => Object.fromEntries(metadataFields[section].map(field => [field, row[field] ?? null])))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), "en"));
  }
  return normalized;
}

export async function readIsolatedMaintenanceInventoryContract(
  prefix: "TEST_DATABASE" | "E2E_DATABASE",
) {
  // Reuse the same fail-fast isolation checks as integration and browser fixtures.
  const config = loadTestDatabaseConfig(prefix);
  const adapter = new PrismaMssql({
    ...config,
    connectionTimeout: 15_000,
    requestTimeout: 15_000,
  });
  let connection: Awaited<ReturnType<PrismaMssql["connect"]>> | undefined;
  try {
    try {
      connection = await adapter.connect();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "CONNECTION_FAILED";
      const safeCode = /^[A-Z_]{2,32}$/.test(code) ? code : "CONNECTION_FAILED";
      // Do not attach the driver error: it can carry connection configuration.
      throw new Error(`${prefix}: SQL Server connection failed (${safeCode}). Check its dedicated environment settings and database access.`);
    }

    const driver = connection.underlyingDriver();
    const identity = await driver.request().query<{ databaseName: string; canViewDefinition: number }>(`
      SELECT DB_NAME() AS databaseName,
        HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'VIEW DEFINITION') AS canViewDefinition
    `);
    const database = identity.recordset[0];
    if (!database || database.databaseName.toLowerCase() !== config.database.toLowerCase()) {
      throw new Error(`${prefix}: live test database identity does not match the isolated configuration.`);
    }
    if (database.canViewDefinition !== 1) {
      throw new Error(`${prefix}: VIEW DEFINITION is required for this read-only contract check.`);
    }

    const result = await driver.request().query<MetadataRow>(MAINTENANCE_INVENTORY_CONTRACT_QUERY);
    const recordsets = result.recordsets as MetadataRow[][];
    if (recordsets.length !== 6) {
      throw new Error(`${prefix}: incomplete SQL Server metadata response.`);
    }
    return normalizeMaintenanceInventoryMetadata({
      tables: recordsets[0], columns: recordsets[1], foreignKeys: recordsets[2],
      indexes: recordsets[3], checks: recordsets[4], objects: recordsets[5],
    });
  } finally {
    await connection?.dispose();
  }
}
