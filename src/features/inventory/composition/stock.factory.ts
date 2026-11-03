import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageStock } from "../application/stock/manage-stock";
import { PrismaStockRepository } from "../infrastructure/stock/prisma-stock-repository";
export function makeManageStock() { return new ManageStock(new PrismaStockRepository(prisma)); }
