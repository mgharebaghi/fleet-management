import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { VehicleMeterRepository, VehicleMeterWriteSession } from "../../application/meter-readings/vehicle-meter-repository";
import type { PreparedVehicleMeter, VehicleMeterReading, VehicleMeterSearch, VehicleMeterState } from "../../application/meter-readings/vehicle-meter-records";
import { lockVehicleDispatch } from "../availability/prisma-vehicle-dispatch-readiness";
const readingSelect = Prisma.sql`SELECT MeterReadingId id,CONVERT(varchar(50),ReadingDate AT TIME ZONE 'Iran Standard Time',127) recordedAt,CONVERT(varchar(40),Odometer) odometer,CONVERT(varchar(40),EngineHour) engineHours,Description description FROM fleet.VehicleMeterReading`;
class PrismaVehicleMeterSession implements VehicleMeterWriteSession {
  constructor(private readonly client: Prisma.TransactionClient, private readonly vehicleId: number) {}
  async snapshot(): Promise<VehicleMeterState | null> {
    const [rows, history] = await Promise.all([
      this.client.$queryRaw<Array<{ odometer: string | null; engineHours: string | null; now: string }>>`SELECT CONVERT(varchar(40),CurrentOdometer) odometer,CONVERT(varchar(40),CurrentEngineHour) engineHours,CONVERT(varchar(50),SYSDATETIME() AT TIME ZONE 'Iran Standard Time',127) [now] FROM fleet.Vehicle WHERE VehicleId=${this.vehicleId}`,
      this.client.$queryRaw<VehicleMeterReading[]>(Prisma.sql`${readingSelect} WHERE VehicleId=${this.vehicleId} ORDER BY ReadingDate,MeterReadingId`),
    ]);
    return rows[0] ? { ...rows[0], history } : null;
  }
  async append(value: PreparedVehicleMeter) {
    const [row] = await this.client.$queryRaw<Array<{ id: number }>>`INSERT fleet.VehicleMeterReading (VehicleId,ReadingDate,Odometer,EngineHour,Description)
      OUTPUT INSERTED.MeterReadingId id VALUES (${this.vehicleId},CONVERT(datetime2,CONVERT(datetimeoffset,${value.recordedAt.toISOString()}) AT TIME ZONE 'Iran Standard Time'),CONVERT(decimal(18,2),${value.odometer}),CONVERT(decimal(18,2),${value.engineHours}),${value.description})`;
    return row.id;
  }
  async updateCurrent(value: { odometer: string | null; engineHours: string | null }) {
    await this.client.$executeRaw`UPDATE fleet.Vehicle SET CurrentOdometer=CONVERT(decimal(18,2),${value.odometer}),CurrentEngineHour=CONVERT(decimal(18,2),${value.engineHours}) WHERE VehicleId=${this.vehicleId}`;
  }
}
export class PrismaVehicleMeterRepository implements VehicleMeterRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(vehicleId: number, work: (session: VehicleMeterWriteSession) => Promise<T>): Promise<T> {
    return this.client.$transaction(async tx => {
      await lockVehicleDispatch(tx, [vehicleId]);
      return work(new PrismaVehicleMeterSession(tx, vehicleId));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  async list(vehicleId: number, search: VehicleMeterSearch) {
    const pattern = `%${search.search.replace(/\[/g, "[[]").replace(/%/g, "[%]").replace(/_/g, "[_]")}%`;
    const where = Prisma.sql`WHERE VehicleId=${vehicleId} ${search.search ? Prisma.sql`AND (CONVERT(varchar(40),Odometer) LIKE ${pattern} OR CONVERT(varchar(40),EngineHour) LIKE ${pattern} OR Description LIKE ${pattern})` : Prisma.empty}`;
    const [rows, [count]] = await Promise.all([
      this.client.$queryRaw<VehicleMeterReading[]>(Prisma.sql`${readingSelect} ${where} ORDER BY ReadingDate DESC,MeterReadingId DESC OFFSET ${(search.page - 1) * 20} ROWS FETCH NEXT 20 ROWS ONLY`),
      this.client.$queryRaw<Array<{ count: number }>>(Prisma.sql`SELECT COUNT(*) count FROM fleet.VehicleMeterReading ${where}`),
    ]);
    return { rows, totalCount: count.count };
  }
}
