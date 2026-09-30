import { describe, expect, it } from "vitest";
import { getAssignmentProgress, getAssignmentTimeStatus } from "./assignment-time-status";

const now = new Date("2026-06-10T08:00:00Z");

describe("assignment time status", () => {
  it.each([
    [new Date("2026-06-11T08:00:00Z"), null, "future"],
    [new Date("2026-06-01T08:00:00Z"), null, "openEnded"],
    [new Date("2026-06-01T08:00:00Z"), new Date("2026-06-10T08:00:00Z"), "ended"],
    [new Date("2026-06-01T08:00:00Z"), new Date("2026-06-17T08:00:00Z"), "nearEnd"],
    [new Date("2026-06-01T08:00:00Z"), new Date("2026-06-17T08:00:01Z"), "active"],
  ] as const)("classifies %s to %s as %s", (fromDateTime, toDateTime, kind) => {
    expect(getAssignmentTimeStatus({ fromDateTime, toDateTime }, now).kind).toBe(kind);
  });
});

describe("assignment progress", () => {
  it("has not started a future assignment", () => {
    expect(getAssignmentProgress({ fromDateTime: new Date("2026-06-11T08:00:00Z"), toDateTime: null }, now)).toBe(0);
  });
  it("is indeterminate for an open end", () => {
    expect(getAssignmentProgress({ fromDateTime: new Date("2026-06-01T08:00:00Z"), toDateTime: null }, now)).toBeNull();
  });
  it("completes an ended assignment", () => {
    expect(getAssignmentProgress({ fromDateTime: new Date("2026-06-01T08:00:00Z"), toDateTime: new Date("2026-06-10T08:00:00Z") }, now)).toBe(1);
  });
  it("computes elapsed fraction for a bounded, in-progress assignment", () => {
    const progress = getAssignmentProgress({ fromDateTime: new Date("2026-06-01T08:00:00Z"), toDateTime: new Date("2026-06-21T08:00:00Z") }, now);
    expect(progress).toBeCloseTo(0.45, 5);
  });
});
