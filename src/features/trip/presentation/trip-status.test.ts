import { describe, expect, it } from "vitest";

import {
  executionStatusLabel,
  executionStatusTargets,
  requestStatusLabel,
  requestStatusTargets,
} from "./trip-status";

describe("Trip status presentation", () => {
  it("shows Persian labels while preserving English values", () => {
    expect(requestStatusLabel("InProgress")).toBe("در حال اجرا");
    expect(executionStatusLabel("Planned")).toBe("برنامه‌ریزی‌شده");
    expect(requestStatusLabel("Legacy")).toBe("Legacy");
  });

  it("offers only forward and pre-start cancellation targets", () => {
    expect(requestStatusTargets("New")).toEqual(["Assigned", "Cancelled"]);
    expect(requestStatusTargets("InProgress")).toEqual(["Completed"]);
    expect(requestStatusTargets("Completed")).toEqual([]);
    expect(executionStatusTargets("Planned")).toEqual([
      "InProgress",
      "Cancelled",
    ]);
    expect(executionStatusTargets("Completed")).toEqual([]);
  });
});
