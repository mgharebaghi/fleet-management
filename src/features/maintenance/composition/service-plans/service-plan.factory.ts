import { prisma } from "../../../../infrastructure/database/prisma/prisma-client";
import { ManageServicePlans } from "../../application/service-plans/manage-service-plans";
import { PrismaServicePlanRepository } from "../../infrastructure/service-plans/prisma-service-plan-repository";
export function makeServicePlans() { return new ManageServicePlans(new PrismaServicePlanRepository(prisma)); }
