import type { Prisma } from "../../../../generated/prisma/client";
import type { MaintenanceRequestVehiclePort } from "../../application/requests/maintenance-request-vehicle-port";
const select = { VehicleId: true, VehicleCode: true, IsActive: true, PlateNoLeftSide: true, PlateNoCenterChar: true, PlateNoRightSide: true, PlateNoIranNo: true, VehicleModel: { select: { ModelName: true, VehicleBrand: { select: { BrandName: true } } } } } as const;
function map(row: Prisma.VehicleGetPayload<{ select: typeof select }>) {
  return { id: row.VehicleId, code: row.VehicleCode, isActive: row.IsActive, modelName: row.VehicleModel.ModelName, brandName: row.VehicleModel.VehicleBrand.BrandName, plateNoLeftSide: row.PlateNoLeftSide, plateNoCenterChar: row.PlateNoCenterChar, plateNoRightSide: row.PlateNoRightSide, plateNoIranNo: row.PlateNoIranNo };
}
export class PrismaMaintenanceRequestVehicleReader implements MaintenanceRequestVehiclePort {
  constructor(private readonly client: Pick<Prisma.TransactionClient, "vehicle">) {}
  async vehicle(id: number) { const row = await this.client.vehicle.findUnique({ where: { VehicleId: id }, select }); return row ? map(row) : null; }
  async options() { return (await this.client.vehicle.findMany({ select, orderBy: { VehicleCode: "asc" } })).map(map); }
}
