import { Prisma, type PrismaClient } from "../../../../generated/prisma/client";
import type { MaintenanceType, Workshop, Technician, SaveMaintenanceType, SaveWorkshop, SaveTechnician, ReferenceSearch } from "../../application/reference-data/maintenance-reference-records";
import { MaintenanceTypeCapacityError, MaintenanceCodeConflictError, MaintenanceReferenceMissingError, MaintenanceTypeInUseError, type MaintenanceReferenceRepository, type MaintenanceReferenceWriteSession } from "../../application/reference-data/maintenance-reference-repository";
import { availableMaintenanceTypeId } from "./available-maintenance-type-id";

const mapType = (row: { MaintenanceTypeId: number; TypeCode: string; TypeName: string; Description: string | null; IsActive: boolean }): MaintenanceType => ({ id: row.MaintenanceTypeId, code: row.TypeCode, name: row.TypeName, description: row.Description, isActive: row.IsActive });
const mapWorkshop = (row: { WorkshopId: number; WorkshopName: string; WorkshopType: string; IsInternal: boolean; Address: string | null; Phone: string | null; ContactPerson: string | null; Description: string | null; IsActive: boolean }): Workshop => ({ id: row.WorkshopId, name: row.WorkshopName, workshopType: row.WorkshopType, isInternal: row.IsInternal, address: row.Address, phone: row.Phone, contactPerson: row.ContactPerson, description: row.Description, isActive: row.IsActive });
const technicianInclude = { Workshop: { select: { WorkshopName: true, IsActive: true } } } as const;
const mapTechnician = (row: { TechnicianId: number; WorkshopId: number | null; FirstName: string; LastName: string; Mobile: string | null; Specialty: string | null; Description: string | null; IsActive: boolean; Workshop: { WorkshopName: string; IsActive: boolean } | null }): Technician => ({ id: row.TechnicianId, workshopId: row.WorkshopId, firstName: row.FirstName, lastName: row.LastName, mobile: row.Mobile, specialty: row.Specialty, description: row.Description, isActive: row.IsActive, workshopName: row.Workshop?.WorkshopName ?? null, workshopActive: row.Workshop?.IsActive ?? null });
function writeError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new MaintenanceCodeConflictError();
    if (error.code === "P2025") throw new MaintenanceReferenceMissingError();
  }
  throw error;
}
class PrismaMaintenanceWriteSession implements MaintenanceReferenceWriteSession {
  constructor(private readonly client: Prisma.TransactionClient) {}
  async type(id: number) { const row = await this.client.maintenanceType.findUnique({ where: { MaintenanceTypeId: id } }); return row ? mapType(row) : null; }
  async typeIsUsed(id: number) {
    const row = await this.client.maintenanceType.findUnique({ where: { MaintenanceTypeId: id }, select: { _count: { select: { MaintenancePlan: true, MaintenanceRequest: true, WorkOrder: true } } } });
    return !!row && Object.values(row._count).some(count => count > 0);
  }
  async deleteType(id: number) {
    try { await this.client.maintenanceType.delete({ where: { MaintenanceTypeId: id } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new MaintenanceTypeInUseError();
      writeError(error);
    }
  }
  async typeCodeExists(code: string, excludingId: number | null) { return !!await this.client.maintenanceType.findFirst({ where: { TypeCode: code, ...(excludingId === null ? {} : { MaintenanceTypeId: { not: excludingId } }) }, select: { MaintenanceTypeId: true } }); }
  async saveType(value: SaveMaintenanceType) {
    const data = { TypeCode: value.code, TypeName: value.name, Description: value.description, IsActive: value.isActive };
    let id = value.id;
    if (id === null) {
      const used = new Set((await this.client.maintenanceType.findMany({ select: { MaintenanceTypeId: true } })).map(row => row.MaintenanceTypeId));
      id = availableMaintenanceTypeId(used);
      if (id === null) throw new MaintenanceTypeCapacityError();
    }
    try { return mapType(value.id === null ? await this.client.maintenanceType.create({ data: { ...data, MaintenanceTypeId: id } }) : await this.client.maintenanceType.update({ where: { MaintenanceTypeId: id }, data })); }
    catch (error) { return writeError(error); }
  }
  async workshop(id: number) { const row = await this.client.workshop.findUnique({ where: { WorkshopId: id } }); return row ? mapWorkshop(row) : null; }
  async saveWorkshop(value: SaveWorkshop) {
    const data = { WorkshopName: value.name, WorkshopType: value.workshopType, IsInternal: value.isInternal, Address: value.address, Phone: value.phone, ContactPerson: value.contactPerson, Description: value.description, IsActive: value.isActive };
    try { return mapWorkshop(value.id === null ? await this.client.workshop.create({ data }) : await this.client.workshop.update({ where: { WorkshopId: value.id }, data })); }
    catch (error) { return writeError(error); }
  }
  async technician(id: number) { const row = await this.client.technician.findUnique({ where: { TechnicianId: id }, include: technicianInclude }); return row ? mapTechnician(row) : null; }
  async saveTechnician(value: SaveTechnician) {
    const data = { WorkshopId: value.workshopId, FirstName: value.firstName, LastName: value.lastName, Mobile: value.mobile, Specialty: value.specialty, Description: value.description, IsActive: value.isActive };
    try { return mapTechnician(value.id === null ? await this.client.technician.create({ data, include: technicianInclude }) : await this.client.technician.update({ where: { TechnicianId: value.id }, data, include: technicianInclude })); }
    catch (error) { return writeError(error); }
  }
}
const activity = (search: ReferenceSearch) => search.active === "all" ? {} : { IsActive: search.active === "active" };
const paging = (search: ReferenceSearch) => ({ skip: (search.page - 1) * 20, take: 20 });
export class PrismaMaintenanceReferenceRepository implements MaintenanceReferenceRepository {
  constructor(private readonly client: PrismaClient) {}
  atomic<T>(work: (session: MaintenanceReferenceWriteSession) => Promise<T>) {
    return this.client.$transaction(async transaction => {
      const [lock] = await transaction.$queryRaw<Array<{ result: number }>>`DECLARE @result int;
        EXEC @result=sys.sp_getapplock @Resource=N'FleetManagement.Maintenance.ReferenceData',@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=10000; SELECT @result result;`;
      if (!lock || lock.result < 0) throw new Error("Maintenance reference lock could not be acquired.");
      return work(new PrismaMaintenanceWriteSession(transaction));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 30000 });
  }
  async types(search: ReferenceSearch) {
    const where: Prisma.MaintenanceTypeWhereInput = { ...activity(search), ...(search.search ? { OR: [{ TypeName: { contains: search.search } }, { TypeCode: { contains: search.search } }] } : {}) };
    const [rows, totalCount] = await Promise.all([this.client.maintenanceType.findMany({ where, include: { _count: { select: { MaintenancePlan: true, MaintenanceRequest: true, WorkOrder: true } } }, orderBy: { MaintenanceTypeId: "desc" }, ...paging(search) }), this.client.maintenanceType.count({ where })]);
    return { rows: rows.map(row => ({ ...mapType(row), isUsed: Object.values(row._count).some(count => count > 0) })), totalCount };
  }
  async type(id: number) { return new PrismaMaintenanceWriteSession(this.client).type(id); }
  async workshops(search: ReferenceSearch) {
    const where: Prisma.WorkshopWhereInput = { ...activity(search), ...(search.search ? { OR: ["WorkshopName", "WorkshopType", "Address", "Phone", "ContactPerson"].map(field => ({ [field]: { contains: search.search } })) } : {}) };
    const [rows, totalCount] = await Promise.all([this.client.workshop.findMany({ where, orderBy: { WorkshopId: "desc" }, ...paging(search) }), this.client.workshop.count({ where })]);
    return { rows: rows.map(mapWorkshop), totalCount };
  }
  async workshop(id: number) {
    const row = await this.client.workshop.findUnique({ where: { WorkshopId: id }, include: { Technician: { orderBy: { TechnicianId: "desc" }, include: technicianInclude }, _count: { select: { WorkOrder: true } } } });
    return row ? { ...mapWorkshop(row), technicians: row.Technician.map(mapTechnician), workOrderCount: row._count.WorkOrder } : null;
  }
  async workshopOptions() { return (await this.client.workshop.findMany({ orderBy: { WorkshopName: "asc" } })).map(mapWorkshop); }
  async technicians(search: ReferenceSearch) {
    const where: Prisma.TechnicianWhereInput = { ...activity(search), ...(search.search ? { AND: search.search.split(/\s+/).map(term => ({ OR: [{ FirstName: { contains: term } }, { LastName: { contains: term } }, { Mobile: { contains: term } }, { Specialty: { contains: term } }, { Workshop: { is: { WorkshopName: { contains: term } } } }] })) } : {}) };
    const [rows, totalCount] = await Promise.all([this.client.technician.findMany({ where, include: technicianInclude, orderBy: { TechnicianId: "desc" }, ...paging(search) }), this.client.technician.count({ where })]);
    return { rows: rows.map(mapTechnician), totalCount };
  }
  async technician(id: number) { return new PrismaMaintenanceWriteSession(this.client).technician(id); }
}
