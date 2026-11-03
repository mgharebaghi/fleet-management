import { Prisma } from "../../../../generated/prisma/client";
import type { WorkOrderTask, WorkTaskTechnician } from "../../application/work-order-tasks/work-order-task-records";
type TaskRow = Omit<WorkOrderTask, "technician"> & { technicianName: string | null; technicianActive: boolean | null; specialty: string | null; workshopName: string | null };
export async function readWorkTasks(client: Prisma.TransactionClient, orderId: number, taskId?: number): Promise<WorkOrderTask[]> {
  const rows = await client.$queryRaw<TaskRow[]>(Prisma.sql`SELECT task.WorkOrderTaskId id,task.WorkOrderId orderId,task.TaskTitle title,task.TechnicianId technicianId,task.Status status,task.Description description,
    CONVERT(varchar(40),task.LaborHours) laborHours,CONVERT(varchar(40),task.LaborCost) laborCost,CONVERT(varchar(50),task.CreatedAt AT TIME ZONE 'Iran Standard Time',127) createdAt,
    CONCAT(tech.FirstName,N' ',tech.LastName) technicianName,tech.IsActive technicianActive,tech.Specialty specialty,w.WorkshopName workshopName
    FROM maintenance.WorkOrderTask task LEFT JOIN maintenance.Technician tech ON tech.TechnicianId=task.TechnicianId LEFT JOIN maintenance.Workshop w ON w.WorkshopId=tech.WorkshopId
    WHERE task.WorkOrderId=${orderId} ${taskId === undefined ? Prisma.empty : Prisma.sql`AND task.WorkOrderTaskId=${taskId}`} ORDER BY task.WorkOrderTaskId`);
  return rows.map(row => ({ id: row.id, orderId: row.orderId, title: row.title, technicianId: row.technicianId, status: row.status, description: row.description, laborHours: row.laborHours, laborCost: row.laborCost, createdAt: row.createdAt,
    technician: row.technicianId === null ? null : { id: row.technicianId, name: row.technicianName!, isActive: row.technicianActive!, specialty: row.specialty, workshopName: row.workshopName } }));
}
export async function readTaskTechnicians(client: Prisma.TransactionClient, id?: number): Promise<WorkTaskTechnician[]> {
  const rows = await client.technician.findMany({ where: id === undefined ? undefined : { TechnicianId: id }, select: { TechnicianId: true, FirstName: true, LastName: true, Specialty: true, IsActive: true, Workshop: { select: { WorkshopName: true } } }, orderBy: [{ LastName: "asc" }, { FirstName: "asc" }] });
  return rows.map(row => ({ id: row.TechnicianId, name: `${row.FirstName} ${row.LastName}`, specialty: row.Specialty, isActive: row.IsActive, workshopName: row.Workshop?.WorkshopName ?? null }));
}
