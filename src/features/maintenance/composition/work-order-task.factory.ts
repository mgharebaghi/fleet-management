import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageWorkOrderTasks } from "../application/work-order-tasks/manage-work-order-tasks";
import { PrismaWorkOrderTaskRepository } from "../infrastructure/work-order-tasks/prisma-work-order-task-repository";
export function makeWorkOrderTasks() { return new ManageWorkOrderTasks(new PrismaWorkOrderTaskRepository(prisma)); }
