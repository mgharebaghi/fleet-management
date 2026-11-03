import "dotenv/config";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { createMssqlConfigFromEnvironment } from "../src/infrastructure/database/prisma/mssql-config.ts";

// User-approved reference labels; no workshops, people, repairs or intervals.
const types = [
  ["PERIODIC-SERVICE", "سرویس دوره‌ای خودرو", "عنوان عمومی برای سرویس دوره‌ای؛ جزئیات و فاصلهٔ سرویس در برنامهٔ همان خودرو تعیین می‌شود."],
  ["OIL-SERVICE", "تعویض روغن موتور و فیلتر روغن", "ثبت خدمات مربوط به روغن موتور و فیلتر روغن."],
  ["AIR-FILTER", "تعویض فیلتر هوا", "ثبت خدمات مربوط به فیلتر هوای موتور."],
  ["FUEL-FILTER", "تعویض فیلتر سوخت", "ثبت خدمات مربوط به فیلتر سوخت خودرو."],
  ["BRAKE-SERVICE", "بازدید و سرویس ترمز", "ثبت بازدید، سرویس یا تعمیر سیستم ترمز."],
  ["TIRE-SERVICE", "سرویس لاستیک و چرخ", "ثبت خدمات مربوط به لاستیک، چرخ، بالانس و تنظیم زوایای چرخ."],
  ["BATTERY-ELECTRICAL", "برق و باتری", "ثبت خدمات مربوط به باتری و تجهیزات برقی خودرو."],
  ["COOLING-SERVICE", "سرویس سیستم خنک‌کننده", "ثبت بازدید، سرویس یا تعمیر سیستم خنک‌کنندهٔ موتور."],
  ["STEERING-SUSPENSION", "تعمیر فرمان و تعلیق", "ثبت خدمات مربوط به فرمان، جلوبندی و سیستم تعلیق."],
  ["ENGINE-REPAIR", "تعمیر موتور", "ثبت عیب‌یابی و تعمیر موتور و متعلقات آن."],
  ["TRANSMISSION-REPAIR", "تعمیر گیربکس و انتقال قدرت", "ثبت خدمات مربوط به کلاچ، گیربکس و انتقال قدرت."],
  ["HVAC-SERVICE", "سرویس بخاری و کولر", "ثبت بازدید، سرویس یا تعمیر سامانهٔ گرمایش و سرمایش کابین."],
];
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--apply")) throw new Error("Supported argument: --apply. Without it, this command previews missing entries.");
const apply = args.includes("--apply");
const config = createMssqlConfigFromEnvironment("DATABASE");
if (config.database !== "FleetManagementDB_Development") throw new Error("Starter catalogs may only target FleetManagementDB_Development.");

let connection;
try {
  connection = await new PrismaMssql(config).connect();
  const driver = connection.underlyingDriver();
  const identity = await driver.request().query("SELECT DB_NAME() databaseName");
  if (identity.recordset[0]?.databaseName !== "FleetManagementDB_Development") throw new Error("Live Development identity mismatch.");
  const request = driver.request();
  const values = types.map(([code, name, description], index) => {
    request.input(`code${index}`, code).input(`name${index}`, name).input(`description${index}`, description);
    return `(@code${index},@name${index},@description${index})`;
  });
  const normalize = column => `REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(${column})),N'ي',N'ی'),N'ك',N'ک'),NCHAR(8204),N' ')`;
  const declarations = `DECLARE @Wanted TABLE (Code varchar(50),Name nvarchar(100),Description nvarchar(500)); INSERT @Wanted VALUES ${values.join(",")};`;
  const missing = `SELECT w.* FROM @Wanted w WHERE NOT EXISTS (SELECT 1 FROM maintenance.MaintenanceType e WHERE e.TypeCode=w.Code OR ${normalize("e.TypeName")}=${normalize("w.Name")})`;
  const existing = `SELECT e.MaintenanceTypeId id,e.TypeCode code,e.TypeName name,e.IsActive active FROM maintenance.MaintenanceType e WHERE EXISTS (SELECT 1 FROM @Wanted w WHERE e.TypeCode=w.Code OR ${normalize("e.TypeName")}=${normalize("w.Name")})`;
  const query = apply ? `
    SET XACT_ABORT ON; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    ${declarations}
    BEGIN TRY
      BEGIN TRANSACTION;
      DECLARE @lockResult int;
      EXEC @lockResult=sys.sp_getapplock @Resource=N'FleetManagement.Maintenance.ReferenceData',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000;
      IF @lockResult<0 THROW 50001,'Maintenance reference-data lock failed.',1;
      DECLARE @Skipped TABLE (id int,code varchar(50),name nvarchar(100),active bit);
      INSERT @Skipped ${existing};
      DECLARE @Missing TABLE (Code varchar(50),Name nvarchar(100),Description nvarchar(500));
      INSERT @Missing ${missing};
      DECLARE @Ids TABLE (Id int PRIMARY KEY);
      INSERT @Ids VALUES ${Array.from({ length: 255 }, (_, index) => `(${index + 1})`).join(",")};
      DECLARE @Added TABLE (id int,code varchar(50),name nvarchar(100));
      WHILE EXISTS (SELECT 1 FROM @Missing)
      BEGIN
        DECLARE @id int=NULL,@code varchar(50),@name nvarchar(100),@description nvarchar(500);
        SELECT TOP(1) @code=Code,@name=Name,@description=Description FROM @Missing ORDER BY Code;
        SELECT @id=MIN(i.Id) FROM @Ids i WHERE NOT EXISTS (SELECT 1 FROM maintenance.MaintenanceType e WITH (UPDLOCK,HOLDLOCK) WHERE e.MaintenanceTypeId=i.Id);
        IF @id IS NULL THROW 50002,'Maintenance type identifier capacity exhausted.',1;
        INSERT maintenance.MaintenanceType (MaintenanceTypeId,TypeCode,TypeName,Description)
          OUTPUT INSERTED.MaintenanceTypeId,INSERTED.TypeCode,INSERTED.TypeName INTO @Added VALUES (@id,@code,@name,@description);
        DELETE FROM @Missing WHERE Code=@code;
      END;
      COMMIT;
      SELECT * FROM @Added ORDER BY id;
      SELECT * FROM @Skipped ORDER BY id;
    END TRY
    BEGIN CATCH
      IF @@TRANCOUNT>0 ROLLBACK;
      THROW;
    END CATCH;
  ` : `${declarations} ${missing}; ${existing};`;
  const result = await request.query(query);
  console.log(JSON.stringify({ mode: apply ? "insert-missing" : "preview-missing", entries: result.recordsets[0], preserved: result.recordsets[1] }, null, 2));
} catch (error) {
  console.error("Maintenance starter catalog command failed:", typeof error?.code === "string" ? error.code : "CHECK_CONFIGURATION_OR_DATABASE_ACCESS");
  process.exitCode = 1;
} finally { await connection?.dispose(); }
