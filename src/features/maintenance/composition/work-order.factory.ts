import { CompleteWorkOrder } from "../application/work-orders/complete-work-order";
import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageWorkOrders } from "../application/work-orders/manage-work-orders";
import { CancelWorkOrder } from "../application/work-orders/cancel-work-order";
import { StartWorkOrder } from "../application/work-orders/start-work-order";
import { PrismaWorkOrderRepository } from "../infrastructure/work-orders/prisma-work-order-repository";
export function makeWorkOrders() { return new ManageWorkOrders(new PrismaWorkOrderRepository(prisma)); }
export function makeCancelWorkOrder() { return new CancelWorkOrder(new PrismaWorkOrderRepository(prisma)); }
export function makeStartWorkOrder() { return new StartWorkOrder(new PrismaWorkOrderRepository(prisma)); }

export function makeCompleteWorkOrder() { return new CompleteWorkOrder(new PrismaWorkOrderRepository(prisma)); }
