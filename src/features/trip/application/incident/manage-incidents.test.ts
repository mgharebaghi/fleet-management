import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManageIncidents } from "./manage-incidents";
import type {
  IncidentRepository,
  IncidentWriteSession,
} from "./incident-repository";

const session = {
  requestOwnership: vi.fn(),
  createAccident: vi.fn(),
  createViolation: vi.fn(),
} satisfies IncidentWriteSession;
const repository = {
  atomic: async <T>(work: (value: IncidentWriteSession) => Promise<T>) =>
    work(session),
} satisfies IncidentRepository;
const manage = new ManageIncidents(repository);

beforeEach(() => {
  vi.resetAllMocks();
  session.requestOwnership.mockResolvedValue({
    status: "Completed",
    assignmentIds: [7],
  });
  session.createAccident.mockResolvedValue(11);
  session.createViolation.mockResolvedValue(12);
});

describe("Trip incident reconciliation", () => {
  it("records an accident against the request's persisted assignment", async () => {
    expect(
      await manage.recordAccident({
        tripRequestId: 1,
        vehicleAssignmentId: 7,
        accidentDateTime: new Date("2026-02-01T09:00:00Z"),
        location: "  جاده قم  ",
        description: " برخورد ",
        damageAmount: "1500.50",
        driverFaultPercent: "25.5",
        policeReportNo: " PR-1 ",
        hasInjury: false,
      }),
    ).toEqual({ success: true, id: 11 });
    expect(session.createAccident).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "جاده قم",
        damageAmount: "1500.50",
        driverFaultPercent: "25.5",
        hasInjury: false,
      }),
    );
  });

  it("rejects unknown amounts instead of fabricating zero", async () => {
    expect(
      await manage.recordViolation({
        tripRequestId: 1,
        vehicleAssignmentId: 7,
        violationDateTime: new Date("2026-02-01T09:00:00Z"),
        violationType: "سرعت غیرمجاز",
        location: null,
        amount: "",
        referenceNo: null,
        description: null,
      }),
    ).toEqual({ success: false, error: "INVALID_AMOUNT" });
  });

  it("never trusts an assignment that is not on the request", async () => {
    expect(
      await manage.recordAccident({
        tripRequestId: 1,
        vehicleAssignmentId: 99,
        accidentDateTime: new Date("2026-02-01T09:00:00Z"),
        location: null,
        description: null,
        damageAmount: null,
        driverFaultPercent: "0",
        policeReportNo: null,
        hasInjury: true,
      }),
    ).toEqual({ success: false, error: "ASSIGNMENT_NOT_ON_REQUEST" });
  });
});
