import { describe, expect, it } from "vitest";

import {
  dropoffBeforePickup,
  initialExecutionDraft,
  type PassengerExecutionDraft,
} from "./execution-draft";
import type { TripExecutionRecord } from "../../application/trip-records";

const draft = (patch: Partial<PassengerExecutionDraft>): PassengerExecutionDraft => ({
  actualPickupDay: "2026-02-01",
  actualPickupTime: "11:30",
  actualDropoffDay: "2026-02-01",
  actualDropoffTime: "12:00",
  startOdometer: "",
  endOdometer: "",
  executionStatus: "Completed",
  executionDescription: "",
  ...patch,
});

describe("dropoffBeforePickup", () => {
  it("rejects an earlier drop-off on the same Tehran day", () => {
    expect(
      dropoffBeforePickup(draft({ actualDropoffTime: "11:00" })),
    ).toBe(true);
  });

  it("rejects a drop-off on an earlier Tehran day", () => {
    expect(
      dropoffBeforePickup(
        draft({ actualDropoffDay: "2026-01-31", actualDropoffTime: "23:50" }),
      ),
    ).toBe(true);
  });

  it("accepts the same instant and a later day", () => {
    expect(dropoffBeforePickup(draft({ actualDropoffTime: "11:30" }))).toBe(false);
    expect(
      dropoffBeforePickup(
        draft({ actualDropoffDay: "2026-02-02", actualDropoffTime: "08:00" }),
      ),
    ).toBe(false);
  });

  it("does not compare a half-entered time", () => {
    expect(dropoffBeforePickup(draft({ actualDropoffTime: "" }))).toBe(false);
  });
});

describe("initialExecutionDraft", () => {
  const execution = {
    status: "InProgress",
    actualPickupDateTime: new Date("2026-02-01T08:00:00Z"),
    actualDropoffDateTime: null,
    startOdometer: "10",
    endOdometer: null,
    description: null,
  } as TripExecutionRecord;

  it("defaults an unfinished drop-off to Completed without inventing times", () => {
    const next = initialExecutionDraft(execution, true);
    expect(next.executionStatus).toBe("Completed");
    expect(next.actualDropoffDay).toBe("");
    expect(next.actualPickupTime).not.toBe("");
  });

  it("keeps a stored status when the dialog is opened for editing", () => {
    expect(initialExecutionDraft(execution, false).executionStatus).toBe("InProgress");
  });

  it("does not rewrite a completed execution", () => {
    const completed = initialExecutionDraft(
      { ...execution, status: "Completed", actualDropoffDateTime: new Date("2026-02-01T09:00:00Z") },
      true,
    );
    expect(completed.executionStatus).toBe("Completed");
    expect(completed.actualDropoffDay).not.toBe("");
  });
});
