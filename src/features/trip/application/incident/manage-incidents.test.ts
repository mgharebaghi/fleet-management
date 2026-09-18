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

const accident = {
  tripRequestId: 1,
  vehicleAssignmentId: 7,
  accidentDateTime: new Date("2026-02-01T09:00:00Z"),
  location: null,
  description: null,
  damageAmount: null,
  driverFaultPercent: "0",
  policeReportNo: null,
  hasInjury: true,
} as const;

beforeEach(() => {
  vi.resetAllMocks();
  session.requestOwnership.mockResolvedValue({
    status: "Completed",
    completedAssignmentIds: [7],
  });
  session.createAccident.mockResolvedValue(11);
  session.createViolation.mockResolvedValue(12);
});

describe("Trip incident reconciliation", () => {
  it("records an accident against a Completed execution assignment", async () => {
    expect(
      await manage.recordAccident({
        ...accident,
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

  it("rejects a Planned execution assignment", async () => {
    session.requestOwnership.mockResolvedValue({
      status: "Assigned",
      completedAssignmentIds: [],
    });
    expect(await manage.recordAccident(accident)).toEqual({
      success: false,
      error: "ASSIGNMENT_NOT_ON_REQUEST",
    });
    expect(session.createAccident).not.toHaveBeenCalled();
  });

  it("rejects a Cancelled execution assignment", async () => {
    session.requestOwnership.mockResolvedValue({
      status: "Assigned",
      completedAssignmentIds: [],
    });
    expect(await manage.recordAccident(accident)).toEqual({
      success: false,
      error: "ASSIGNMENT_NOT_ON_REQUEST",
    });
    expect(session.createAccident).not.toHaveBeenCalled();
  });

  it("never trusts an assignment that is not on the request", async () => {
    expect(
      await manage.recordAccident({
        ...accident,
        vehicleAssignmentId: 99,
      }),
    ).toEqual({ success: false, error: "ASSIGNMENT_NOT_ON_REQUEST" });
    expect(session.createAccident).not.toHaveBeenCalled();
  });

  it("rejects incidents on a Cancelled request", async () => {
    session.requestOwnership.mockResolvedValue({
      status: "Cancelled",
      completedAssignmentIds: [7],
    });
    expect(await manage.recordAccident(accident)).toEqual({
      success: false,
      error: "REQUEST_TERMINAL",
    });
    expect(session.createAccident).not.toHaveBeenCalled();
  });
});
