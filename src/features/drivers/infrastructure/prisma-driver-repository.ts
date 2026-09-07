import { Prisma, type PrismaClient } from "../../../generated/prisma/client";
import type { DriverRepository, DriverSession } from "../application/driver-repository";
import type { Assignment, NewAssignment, NewLicense, UpdatedAssignment, UpdatedLicense } from "../application/driver-records";

const personSelect = { PersonId: true, FirstName: true, LastName: true, PersonnelNo: true, NationalCode: true, IsActive: true } satisfies Prisma.PeopleSelect;
const vehicleSelect = {
  VehicleId: true, VehicleCode: true, PlateNoLeftSide: true, PlateNoCenterChar: true, PlateNoRightSide: true, PlateNoIranNo: true, IsActive: true,
  VehicleModel: { select: { ModelName: true, VehicleBrand: { select: { BrandName: true } }, VehicleType: { select: { TypeName: true } } } },
} satisfies Prisma.VehicleSelect;
const mapPerson = (p: Prisma.PeopleGetPayload<{ select: typeof personSelect }>) => ({ personId: p.PersonId, firstName: p.FirstName, lastName: p.LastName, personnelNo: p.PersonnelNo, nationalCode: p.NationalCode, isActive: p.IsActive });
const mapVehicle = (v: Prisma.VehicleGetPayload<{ select: typeof vehicleSelect }>) => ({
  vehicleId: v.VehicleId, vehicleCode: v.VehicleCode, plate: [v.PlateNoLeftSide, v.PlateNoCenterChar, v.PlateNoRightSide, v.PlateNoIranNo].filter(Boolean).join(" · "), isActive: v.IsActive,
  brandName: v.VehicleModel.VehicleBrand.BrandName, modelName: v.VehicleModel.ModelName, vehicleTypeName: v.VehicleModel.VehicleType?.TypeName ?? null,
  plateNoLeftSide: v.PlateNoLeftSide, plateNoCenterChar: v.PlateNoCenterChar, plateNoRightSide: v.PlateNoRightSide, plateNoIranNo: v.PlateNoIranNo,
});
const mapLicense = (l: Prisma.DriverLicenseGetPayload<object>) => ({ licenseId: l.DriverLicenseId, driverId: l.DriverId, licenseType: l.LicenseType, licenseNo: l.LicenseNo, issueDate: l.IssueDate, expireDate: l.ExpireDate, isActive: l.IsActive });
type Client = Prisma.TransactionClient;

async function readAssignments(client: Client, where: Prisma.VehicleDriverAssignmentWhereInput): Promise<Assignment[]> {
  const rows = await client.vehicleDriverAssignment.findMany({ where, select: {
    AssignmentId: true, DriverId: true, VehicleId: true, FromDateTime: true, ToDateTime: true, Description: true, Vehicle: { select: vehicleSelect },
  }, orderBy: [{ FromDateTime: "desc" }, { AssignmentId: "desc" }] });
  if (!rows.length) return [];
  // Decode decimal as text; the MSSQL adapter can otherwise pass through Number.
  const amounts = await client.$queryRaw<Array<{ id: number; start: string | null; end: string | null }>>(Prisma.sql`
    SELECT AssignmentId AS id, CONVERT(varchar(40), StartOdometer) AS start, CONVERT(varchar(40), EndOdometer) AS [end]
    FROM driver.VehicleDriverAssignment WHERE AssignmentId IN (${Prisma.join(rows.map(r => r.AssignmentId))})`);
  const byId = new Map(amounts.map(a => [a.id, a]));
  return rows.map(row => {
    const amount = byId.get(row.AssignmentId);
    if (!amount) throw new Error("Assignment changed while reading odometers.");
    return { assignmentId: row.AssignmentId, driverId: row.DriverId, vehicleId: row.VehicleId, fromDateTime: row.FromDateTime, toDateTime: row.ToDateTime, startOdometer: amount.start, endOdometer: amount.end, description: row.Description, vehicle: mapVehicle(row.Vehicle) };
  });
}

class PrismaDriverSession implements DriverSession {
  constructor(private readonly client: Client) {}
  async person(id: number) { const row = await this.client.people.findUnique({ where: { PersonId: id }, select: personSelect }); return row ? mapPerson(row) : null; }
  async driverForPerson(id: number) { return await this.client.driver.findUnique({ where: { PersonId: id }, select: { DriverId: true } }) !== null; }
  async driver(id: number) {
    const row = await this.client.driver.findUnique({ where: { DriverId: id }, select: { DriverId: true, People: { select: personSelect } } });
    return row ? { driverId: row.DriverId, ...mapPerson(row.People) } : null;
  }
  async vehicle(id: number) { const row = await this.client.vehicle.findUnique({ where: { VehicleId: id }, select: vehicleSelect }); return row ? mapVehicle(row) : null; }
  async licenses(id: number) { return (await this.client.driverLicense.findMany({ where: { DriverId: id }, orderBy: { DriverLicenseId: "desc" } })).map(mapLicense); }
  async license(id: number) { const row = await this.client.driverLicense.findUnique({ where: { DriverLicenseId: id } }); return row ? mapLicense(row) : null; }
  async licenseNumberExists(number: string, excludingLicenseId?: number) { return await this.client.driverLicense.findFirst({ where: { LicenseNo: number, ...(excludingLicenseId ? { DriverLicenseId: { not: excludingLicenseId } } : {}) }, select: { DriverLicenseId: true } }) !== null; }
  // Half-open intervals ([From, To)), mirroring assignment-rules.ts's overlaps():
  // an existing row only conflicts if it starts before the new period ends AND
  // ends after the new period starts. A row whose ToDateTime lands exactly on
  // the new FromDateTime is a handover, not a conflict — `gt`, not `gte`, is
  // what allows the new assignment to start the instant the old one ended.
  async overlap(input: NewAssignment, by: "driver" | "vehicle", excludingAssignmentId?: number) {
    return await this.client.vehicleDriverAssignment.findFirst({ where: {
      ...(by === "driver" ? { DriverId: input.driverId } : { VehicleId: input.vehicleId }),
      ...(excludingAssignmentId ? { AssignmentId: { not: excludingAssignmentId } } : {}),
      ...(input.toDateTime === null ? {} : { FromDateTime: { lt: input.toDateTime } }),
      OR: [{ ToDateTime: null }, { ToDateTime: { gt: input.fromDateTime } }],
    }, select: { AssignmentId: true } }) !== null;
  }
  async assignment(id: number) { return (await readAssignments(this.client, { AssignmentId: id }))[0] ?? null; }
  async createDriver(personId: number) { return (await this.client.driver.create({ data: { PersonId: personId } })).DriverId; }
  async createLicense(input: NewLicense) {
    return (await this.client.driverLicense.create({ data: { DriverId: input.driverId, LicenseType: input.licenseType, LicenseNo: input.licenseNo, IssueDate: input.issueDate, ExpireDate: input.expireDate, IsActive: input.isActive } })).DriverLicenseId;
  }
  async updateLicense(input: UpdatedLicense) {
    await this.client.driverLicense.update({ where: { DriverLicenseId: input.licenseId }, data: { LicenseType: input.licenseType, LicenseNo: input.licenseNo, IssueDate: input.issueDate, ExpireDate: input.expireDate, IsActive: input.isActive } });
  }
  async deleteLicense(id: number) { await this.client.driverLicense.delete({ where: { DriverLicenseId: id } }); }
  async createAssignment(input: NewAssignment) {
    return (await this.client.vehicleDriverAssignment.create({ data: {
      DriverId: input.driverId, VehicleId: input.vehicleId, FromDateTime: input.fromDateTime, ToDateTime: input.toDateTime,
      StartOdometer: input.startOdometer === null ? null : new Prisma.Decimal(input.startOdometer), EndOdometer: input.endOdometer === null ? null : new Prisma.Decimal(input.endOdometer), Description: input.description,
    }, select: { AssignmentId: true } })).AssignmentId;
  }
  async updateAssignment(input: UpdatedAssignment) {
    await this.client.vehicleDriverAssignment.update({ where: { AssignmentId: input.assignmentId }, data: {
      VehicleId: input.vehicleId, FromDateTime: input.fromDateTime, ToDateTime: input.toDateTime,
      StartOdometer: input.startOdometer === null ? null : new Prisma.Decimal(input.startOdometer), EndOdometer: input.endOdometer === null ? null : new Prisma.Decimal(input.endOdometer), Description: input.description,
    } });
  }
  async closeAssignment(id: number, end: Date, odometer: string | null) {
    const result = await this.client.vehicleDriverAssignment.updateMany({ where: { AssignmentId: id, ToDateTime: null }, data: { ToDateTime: end, EndOdometer: odometer === null ? null : new Prisma.Decimal(odometer) } });
    if (result.count !== 1) throw new Error("Assignment changed during close.");
  }
  async deleteAssignment(id: number) { await this.client.vehicleDriverAssignment.delete({ where: { AssignmentId: id } }); }
}

export class PrismaDriverRepository implements DriverRepository {
  constructor(private readonly client: PrismaClient) {}
  async atomic<T>(work: (session: DriverSession) => Promise<T>): Promise<T> {
    return this.client.$transaction(async tx => {
      // Transaction-owned application lock coordinates every Drivers writer,
      // including different application instances, without changing schema.
      const [lock] = await tx.$queryRaw<Array<{ result: number }>>`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource=N'FleetManagement.Drivers.Write', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
        SELECT @result AS result;`;
      if (!lock || lock.result < 0) throw new Error("Drivers write lock could not be acquired.");
      return work(new PrismaDriverSession(tx));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15000, timeout: 20000 });
  }
  async list(search: string, page: number) {
    const contains = { contains: search };
    const where: Prisma.DriverWhereInput = search ? { People: { OR: [{ FirstName: contains }, { LastName: contains }, { PersonnelNo: contains }, { NationalCode: contains }] } } : {};
    const [rows, totalCount] = await Promise.all([
      this.client.driver.findMany({ where, select: { DriverId: true, People: { select: personSelect } }, orderBy: { DriverId: "desc" }, skip: (page - 1) * 20, take: 20 }),
      this.client.driver.count({ where }),
    ]);
    return { drivers: rows.map(row => ({ driverId: row.DriverId, ...mapPerson(row.People) })), totalCount };
  }
  async details(id: number) {
    return this.client.$transaction(async tx => {
      const session = new PrismaDriverSession(tx);
      const driver = await session.driver(id);
      if (!driver) return null;
      return { ...driver, licenses: await session.licenses(id), assignments: await readAssignments(tx, { DriverId: id }) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async availablePeople() { return (await this.client.people.findMany({ where: { IsActive: true, Driver: null }, select: personSelect, orderBy: [{ LastName: "asc" }, { PersonId: "asc" }] })).map(mapPerson); }
  async availableVehicles() { return (await this.client.vehicle.findMany({ where: { IsActive: true }, select: vehicleSelect, orderBy: [{ VehicleCode: "asc" }, { VehicleId: "asc" }] })).map(mapVehicle); }
}
