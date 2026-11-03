import { ListVehicleMeters } from "../../application/meter-readings/list-vehicle-meters";
import { prisma } from "../../../../infrastructure/database/prisma/prisma-client";
import { RecordVehicleMeter } from "../../application/meter-readings/record-vehicle-meter";
import { PrismaVehicleMeterRepository } from "../../infrastructure/meter-readings/prisma-vehicle-meter-repository";
export function makeRecordVehicleMeter() { return new RecordVehicleMeter(new PrismaVehicleMeterRepository(prisma)); }
export function makeListVehicleMeters() { return new ListVehicleMeters(new PrismaVehicleMeterRepository(prisma)); }
