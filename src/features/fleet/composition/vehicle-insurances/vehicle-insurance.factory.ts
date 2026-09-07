import { prisma } from "@/infrastructure/database/prisma/prisma-client";
import { CreateVehicleInsurance } from "../../application/vehicle-insurances/create-vehicle-insurance/create-vehicle-insurance";
import { DeleteVehicleInsurance } from "../../application/vehicle-insurances/delete-vehicle-insurance/delete-vehicle-insurance";
import { GetVehicleInsurance } from "../../application/vehicle-insurances/get-vehicle-insurance/get-vehicle-insurance";
import { ListInsuranceVehicles } from "../../application/vehicle-insurances/list-insurance-vehicles/list-insurance-vehicles";
import { ListVehicleInsurances } from "../../application/vehicle-insurances/list-vehicle-insurances/list-vehicle-insurances";
import { UpdateVehicleInsurance } from "../../application/vehicle-insurances/update-vehicle-insurance/update-vehicle-insurance";
import { PrismaVehicleInsuranceRepository } from "../../infrastructure/vehicle-insurances/prisma/prisma-vehicle-insurance-repository";

export function makeCreateVehicleInsurance() {
  const repository = new PrismaVehicleInsuranceRepository(prisma);
  return new CreateVehicleInsurance(repository, repository);
}
export function makeListVehicleInsurances() {
  return new ListVehicleInsurances(new PrismaVehicleInsuranceRepository(prisma));
}
export function makeListInsuranceVehicles() {
  return new ListInsuranceVehicles(new PrismaVehicleInsuranceRepository(prisma));
}
export function makeGetVehicleInsurance() {
  return new GetVehicleInsurance(new PrismaVehicleInsuranceRepository(prisma));
}
export function makeUpdateVehicleInsurance() {
  const repository = new PrismaVehicleInsuranceRepository(prisma);
  return new UpdateVehicleInsurance(repository, repository);
}
export function makeDeleteVehicleInsurance() {
  return new DeleteVehicleInsurance(new PrismaVehicleInsuranceRepository(prisma));
}
