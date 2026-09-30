import { afterEach, describe, expect, it, vi } from "vitest";
import { reportServerFailure } from "./report-server-failure";

afterEach(() => vi.restoreAllMocks());
describe("server failure reporting", () => {
  it("reports only an allowlisted category and Prisma code, without error messages or stacks", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    reportServerFailure("trip.write", Object.assign(new Error("synthetic-sensitive-input"), { code: "P2003" }));
    expect(log).toHaveBeenCalledWith("Server operation failed", { operation: "trip.write", category: "Error", code: "P2003" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("synthetic-sensitive-input");
  });
  it("does not echo arbitrary categories or codes", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    reportServerFailure("drivers.write", { name: "sensitive", code: "sensitive" });
    expect(log).toHaveBeenCalledWith("Server operation failed", { operation: "drivers.write", category: "UnknownError" });
  });
});
