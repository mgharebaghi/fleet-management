import { describe, expect, it } from "vitest";

import {
  canCancelTripRequest,
  canTransitionTripExecution,
  canTransitionTripRequest,
  everyPassengerExecutionCompleted,
  everyPassengerHasPersistedPlan,
  jalaliYearOf,
  nextTripRequestNo,
} from "./trip-lifecycle";

describe("Trip request lifecycle", () => {
  it.each([
    ["New", "Assigned"],
    ["Assigned", "InProgress"],
    ["InProgress", "Completed"],
  ] as const)("allows %s → %s", (current, target) => {
    expect(canTransitionTripRequest(current, target, false)).toBe(true);
  });

  it("allows cancellation only before execution starts", () => {
    expect(canTransitionTripRequest("New", "Cancelled", false)).toBe(true);
    expect(canTransitionTripRequest("Assigned", "Cancelled", false)).toBe(true);
    expect(canTransitionTripRequest("Assigned", "Cancelled", true)).toBe(false);
    expect(canTransitionTripRequest("InProgress", "Cancelled", false)).toBe(
      false,
    );
  });

  it("offers cancellation only from New or Assigned before execution starts", () => {
    expect(canCancelTripRequest("New", false)).toBe(true);
    expect(canCancelTripRequest("Assigned", false)).toBe(true);
    expect(canCancelTripRequest("New", true)).toBe(false);
    expect(canCancelTripRequest("Assigned", true)).toBe(false);
    expect(canCancelTripRequest("InProgress", false)).toBe(false);
    expect(canCancelTripRequest("Completed", false)).toBe(false);
    expect(canCancelTripRequest("Cancelled", false)).toBe(false);
  });

  it("rejects reverse and terminal transitions", () => {
    expect(canTransitionTripRequest("Assigned", "New", false)).toBe(false);
    expect(canTransitionTripRequest("Completed", "InProgress", false)).toBe(
      false,
    );
    expect(canTransitionTripRequest("Cancelled", "New", false)).toBe(false);
  });
});

describe("Trip execution lifecycle", () => {
  it("allows the forward lifecycle and Planned cancellation", () => {
    expect(canTransitionTripExecution("Planned", "InProgress", false)).toBe(
      true,
    );
    expect(canTransitionTripExecution("InProgress", "Completed", true)).toBe(
      true,
    );
    expect(canTransitionTripExecution("Planned", "Cancelled", false)).toBe(
      true,
    );
  });

  it("rejects reverse transitions and cancellation after start", () => {
    expect(canTransitionTripExecution("InProgress", "Planned", true)).toBe(
      false,
    );
    expect(canTransitionTripExecution("Planned", "Cancelled", true)).toBe(
      false,
    );
    expect(canTransitionTripExecution("Completed", "Cancelled", true)).toBe(
      false,
    );
  });
});

describe("Trip RequestNo sequence", () => {
  describe("jalaliYearOf", () => {
    it("resolves a standard mid-year date", () => {
      expect(jalaliYearOf(new Date("2025-07-15T12:00:00Z"))).toBe(1404);
    });

    it("resolves exact Jalali year boundary / Nowruz transition for 1403/1404 in Tehran timezone", () => {
      // 1403 is a leap year (Esfand has 30 days).
      // 1403/12/30 23:59:59 in Tehran (UTC+03:30) is 2025-03-20T20:29:59Z.
      expect(jalaliYearOf(new Date("2025-03-20T20:29:59Z"))).toBe(1403);
      // 1404/01/01 00:00:00 in Tehran (UTC+03:30) is 2025-03-20T20:30:00Z.
      expect(jalaliYearOf(new Date("2025-03-20T20:30:00Z"))).toBe(1404);
      expect(jalaliYearOf(new Date("2025-03-21T00:00:00Z"))).toBe(1404);
    });

    it("resolves exact Jalali year boundary / Nowruz transition for 1404/1405 in Tehran timezone", () => {
      // 1404 is a standard year (Esfand has 29 days).
      // 1404/12/29 23:59:59 in Tehran (UTC+03:30) is 2026-03-20T20:29:59Z.
      expect(jalaliYearOf(new Date("2026-03-20T20:29:59Z"))).toBe(1404);
      // 1405/01/01 00:00:00 in Tehran (UTC+03:30) is 2026-03-20T20:30:00Z.
      expect(jalaliYearOf(new Date("2026-03-20T20:30:00Z"))).toBe(1405);
    });

    it("throws when given an invalid date", () => {
      expect(() => jalaliYearOf(new Date("invalid"))).toThrow(
        /Invalid time value|The request date has no supported Jalali year/,
      );
      expect(() => jalaliYearOf(new Date(Number.NaN))).toThrow(
        /Invalid time value|The request date has no supported Jalali year/,
      );
    });
  });

  it("normalizes existing numbers and increments the yearly maximum", () => {
    expect(
      nextTripRequestNo(1404, [
        "TR-1403-9999",
        " tr-1404-0002 ",
        "TR-1404-invalid",
        "TR-1404-0007",
      ]),
    ).toBe("TR-1404-0008");
  });

  it("starts each year at one and reports exhaustion", () => {
    expect(nextTripRequestNo(1405, ["TR-1404-9999"])).toBe("TR-1405-0001");
    expect(nextTripRequestNo(1404, ["TR-1404-9999"])).toBeNull();
  });
});

describe("Trip request planning completeness", () => {
  it("requires a non-cancelled execution per passenger before Assigned", () => {
    expect(
      everyPassengerHasPersistedPlan({
        status: "New",
        passengers: [{ tripId: 1, executions: [] }],
      }),
    ).toBe(false);
    expect(
      everyPassengerHasPersistedPlan({
        status: "New",
        passengers: [
          {
            tripId: 1,
            executions: [
              {
                tripExecutionId: 1,
                status: "Planned",
                actualPickupDateTime: null,
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });

  it("requires remaining child executions to be Completed", () => {
    expect(
      everyPassengerExecutionCompleted({
        status: "InProgress",
        passengers: [
          {
            tripId: 1,
            executions: [
              {
                tripExecutionId: 1,
                status: "InProgress",
                actualPickupDateTime: new Date(),
              },
            ],
          },
        ],
      }),
    ).toBe(false);
    expect(
      everyPassengerExecutionCompleted({
        status: "InProgress",
        passengers: [
          {
            tripId: 1,
            executions: [
              {
                tripExecutionId: 1,
                status: "Completed",
                actualPickupDateTime: new Date(),
              },
            ],
          },
        ],
      }),
    ).toBe(true);
  });
});
