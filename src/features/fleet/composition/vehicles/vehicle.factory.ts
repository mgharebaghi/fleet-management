import { prisma } from "@/infrastructure/database/prisma/prisma-client";
import { PrismaVehicleRepository } from "../../infrastructure/vehicles/prisma/prisma-vehicle-repository";
import { CreateVehicle } from "../../application/vehicles/create-vehicle/create-vehicle";
import { ListVehicles } from "../../application/vehicles/list-vehicles/list-vehicles";
export function makeCreateVehicle() {
  const repository = new PrismaVehicleRepository(prisma);
  return new CreateVehicle(repository, repository, repository);
}
export function makeListVehicles() {
  return new ListVehicles(new PrismaVehicleRepository(prisma));
}
