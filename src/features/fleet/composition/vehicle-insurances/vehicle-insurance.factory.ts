import { prisma } from "@/infrastructure/database/prisma/prisma-client";
import { CreateVehicleInsurance } from "../../application/vehicle-insurances/create-vehicle-insurance/create-vehicle-insurance";
import { ListVehicleInsurances } from "../../application/vehicle-insurances/list-vehicle-insurances/list-vehicle-insurances";
import { ListInsuranceVehicles } from "../../application/vehicle-insurances/list-insurance-vehicles/list-insurance-vehicles";
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
