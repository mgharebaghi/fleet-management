import {
  Prisma,
  type PrismaClient,
} from "../../../../generated/prisma/client";
import type {
  IncidentRepository,
  IncidentWriteSession,
} from "../../application/incident/incident-repository";
import type {
  RecordAccidentCommand,
  RecordViolationCommand,
} from "../../application/incident/incident-records";

type Client = Prisma.TransactionClient;

class PrismaIncidentWriteSession implements IncidentWriteSession {
  constructor(private readonly client: Client) {}

  async requestOwnership(tripRequestId: number) {
    const row = await this.client.tripRequest.findUnique({
      where: { TripRequestId: tripRequestId },
      select: {
        Status: true,
        Trip: {
          select: {
            TripExecution: {
              select: { VehicleDriverAssignmentId: true },
            },
          },
        },
      },
    });
    return row
      ? {
          status: row.Status,
          assignmentIds: [
            ...new Set(
              row.Trip.flatMap((trip) =>
                trip.TripExecution.map(
                  (execution) => execution.VehicleDriverAssignmentId,
                ),
              ),
            ),
          ],
        }
      : null;
  }

  async createAccident(input: RecordAccidentCommand) {
    const row = await this.client.accident.create({
      data: {
        TripRequestId: input.tripRequestId,
        VehicleAssignmentId: input.vehicleAssignmentId,
        AccidentDateTime: input.accidentDateTime,
        Location: input.location,
        Description: input.description,
        DamageAmount:
          input.damageAmount === null
            ? null
            : new Prisma.Decimal(input.damageAmount),
        DriverFaultPercent:
          input.driverFaultPercent === null
            ? null
            : new Prisma.Decimal(input.driverFaultPercent),
        PoliceReportNo: input.policeReportNo,
        HasInjury: input.hasInjury,
      },
      select: { AccidentId: true },
    });
    return Number(row.AccidentId);
  }

  async createViolation(input: RecordViolationCommand) {
    const row = await this.client.vehicleViolation.create({
      data: {
        TripRequestId: input.tripRequestId,
        VehicleAssignmentId: input.vehicleAssignmentId,
        ViolationDateTime: input.violationDateTime,
        ViolationType: input.violationType,
        Location: input.location,
        Amount: new Prisma.Decimal(input.amount),
        ReferenceNo: input.referenceNo,
        Status: "Unpaid",
        Description: input.description,
      },
      select: { ViolationId: true },
    });
    return Number(row.ViolationId);
  }
}

export class PrismaIncidentRepository implements IncidentRepository {
  constructor(private readonly client: PrismaClient) {}

  async atomic<T>(work: (session: IncidentWriteSession) => Promise<T>) {
    return this.client.$transaction(
      (transaction) => work(new PrismaIncidentWriteSession(transaction)),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 15_000,
        timeout: 30_000,
      },
    );
  }
}
