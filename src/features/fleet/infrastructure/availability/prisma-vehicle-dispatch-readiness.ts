import { Prisma } from "../../../../generated/prisma/client";
import type { VehicleDispatchReadiness, VehicleDispatchCheck } from "../../application/availability/vehicle-dispatch-readiness";

export async function lockVehicleDispatch(client: Prisma.TransactionClient, vehicleIds: readonly number[]) {
  for (const id of [...new Set(vehicleIds)].sort((a, b) => a - b)) {
    const resource = `FleetManagement.Vehicle.Dispatch.${id}`;
    const [lock] = await client.$queryRaw<Array<{ result: number }>>`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=${resource},@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
    if (!lock || lock.result < 0) throw new Error("Vehicle dispatch lock could not be acquired.");
  }
}

export class PrismaVehicleDispatchReadiness implements VehicleDispatchReadiness {
  constructor(private readonly client: Prisma.TransactionClient, private readonly lockedVehicleIds: readonly number[]) {}
  async check(vehicleIds: readonly number[]): Promise<VehicleDispatchCheck> {
    const ids = [...new Set(vehicleIds)];
    // Resolve identifiers before the transaction and recheck under the locks;
    // never acquire a new vehicle lock after business reads.
    if (ids.some(id => !this.lockedVehicleIds.includes(id))) return { available: false, reason: "VEHICLE_DISPATCH_CHANGED" };
    if (!ids.length) return { available: true };
    const rows = await this.client.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT Status status FROM maintenance.WorkOrder WHERE VehicleId IN (${Prisma.join(ids)})`);
    if (rows.some(row => row.status === "InProgress")) return { available: false, reason: "VEHICLE_UNDER_REPAIR" };
    if (rows.some(row => !["Open", "Completed", "Cancelled"].includes(row.status))) return { available: false, reason: "VEHICLE_REPAIR_STATE_UNKNOWN" };
    return { available: true };
  }
}
