import { prisma } from "@/infrastructure/database/prisma/prisma-client";
import { PrismaVehicleRepository } from "../../infrastructure/vehicles/prisma/prisma-vehicle-repository";
import { CreateVehicle } from "../../application/vehicles/create-vehicle/create-vehicle";
import { DeleteVehicle } from "../../application/vehicles/delete-vehicle/delete-vehicle";
import { GetVehicle } from "../../application/vehicles/get-vehicle/get-vehicle";
import { ListVehicles } from "../../application/vehicles/list-vehicles/list-vehicles";
import { UpdateVehicle } from "../../application/vehicles/update-vehicle/update-vehicle";
export function makeCreateVehicle() {
  const repository = new PrismaVehicleRepository(prisma);
  return new CreateVehicle(repository, repository, repository);
}
export function makeListVehicles() {
  return new ListVehicles(new PrismaVehicleRepository(prisma));
}
export function makeGetVehicle() {
  return new GetVehicle(new PrismaVehicleRepository(prisma));
}
export function makeUpdateVehicle() {
  const repository = new PrismaVehicleRepository(prisma);
  return new UpdateVehicle(repository, repository, repository);
}
export function makeDeleteVehicle() {
  return new DeleteVehicle(new PrismaVehicleRepository(prisma));
}
