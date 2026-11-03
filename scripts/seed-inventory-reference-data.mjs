import "dotenv/config";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { createMssqlConfigFromEnvironment } from "../src/infrastructure/database/prisma/mssql-config.ts";

// User-approved starter catalogs; never create parts, warehouses or stock here.
const units = [
  ["عدد", "عدد"], ["جفت", "جفت"], ["دست", "دست"], ["ست", "ست"],
  ["لیتر", "L"], ["میلی‌لیتر", "mL"], ["کیلوگرم", "kg"], ["گرم", "g"],
  ["متر", "m"], ["بسته", "بسته"],
];
const categories = [
  "روغن و روانکار", "فیلترها", "موتور و متعلقات", "سیستم ترمز",
  "سیستم تعلیق و فرمان", "انتقال قدرت", "سیستم سوخت‌رسانی",
  "سیستم خنک‌کننده", "برق و الکترونیک", "باتری", "لاستیک و چرخ",
  "تسمه و شیلنگ", "بدنه و اتاق", "لوازم و اقلام مصرفی",
];
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--apply")) throw new Error("Supported argument: --apply. Without it, this command only previews missing entries.");
const apply = args.includes("--apply");
const config = createMssqlConfigFromEnvironment("DATABASE");
if (config.database !== "FleetManagementDB_Development") {
  throw new Error("Starter catalogs may only target FleetManagementDB_Development.");
}
let connection;
try {
  connection = await new PrismaMssql(config).connect();
  const driver = connection.underlyingDriver();
  const identity = await driver.request().query("SELECT DB_NAME() AS databaseName");
  if (identity.recordset[0]?.databaseName !== "FleetManagementDB_Development") throw new Error("Live Development identity mismatch.");
  const request = driver.request();
  const unitValues = units.map(([name, symbol], index) => {
    request.input(`unitName${index}`, name).input(`unitSymbol${index}`, symbol);
    return `(@unitName${index}, @unitSymbol${index})`;
  });
  const categoryValues = categories.map((name, index) => {
    request.input(`category${index}`, name);
    return `(@category${index})`;
  });
  const matchName = column => `REPLACE(REPLACE(LTRIM(RTRIM(${column})), N'ي', N'ی'), N'ك', N'ک')`;
  const declarations = `
    DECLARE @Units TABLE (UnitName nvarchar(50), Symbol nvarchar(20));
    INSERT INTO @Units VALUES ${unitValues.join(",")};
    DECLARE @Categories TABLE (CategoryName nvarchar(100));
    INSERT INTO @Categories VALUES ${categoryValues.join(",")};
  `;
  const missingUnits = `SELECT w.UnitName, w.Symbol FROM @Units w WHERE NOT EXISTS
    (SELECT 1 FROM inventory.Unit e WHERE ${matchName("e.UnitName")} = w.UnitName)`;
  const missingCategories = `SELECT w.CategoryName FROM @Categories w WHERE NOT EXISTS
    (SELECT 1 FROM inventory.PartCategory e WHERE ${matchName("e.CategoryName")} = w.CategoryName)`;
  const query = apply ? `
    SET XACT_ABORT ON;
    ${declarations}
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @lockResult int;
      EXEC @lockResult = sys.sp_getapplock
        @Resource=N'FleetManagement.Inventory.ReferenceData',
        @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
      IF @lockResult < 0 THROW 50001, 'Inventory reference-data lock failed.', 1;
      DECLARE @AddedUnits TABLE (UnitId int, UnitName nvarchar(50), Symbol nvarchar(20));
      DECLARE @AddedCategories TABLE (PartCategoryId int, CategoryName nvarchar(100));
      INSERT INTO inventory.Unit (UnitName, Symbol)
        OUTPUT INSERTED.UnitId, INSERTED.UnitName, INSERTED.Symbol INTO @AddedUnits
        ${missingUnits};
      INSERT INTO inventory.PartCategory (CategoryName)
        OUTPUT INSERTED.PartCategoryId, INSERTED.CategoryName INTO @AddedCategories
        ${missingCategories};
      COMMIT;
      SELECT * FROM @AddedUnits ORDER BY UnitId;
      SELECT * FROM @AddedCategories ORDER BY PartCategoryId;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT > 0 ROLLBACK;
      THROW;
    END CATCH;
  ` : `${declarations} ${missingUnits}; ${missingCategories};`;
  const result = await request.query(query);
  console.log(JSON.stringify({ mode: apply ? "insert-missing" : "preview-missing", units: result.recordsets[0], categories: result.recordsets[1] }, null, 2));
} catch (error) {
  // Avoid printing driver objects that can contain connection settings.
  console.error("Inventory starter catalog command failed:", typeof error?.code === "string" ? error.code : "CHECK_CONFIGURATION_OR_DATABASE_ACCESS");
  process.exitCode = 1;
} finally {
  await connection?.dispose();
}
