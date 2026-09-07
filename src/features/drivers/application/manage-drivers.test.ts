import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageDrivers } from "./manage-drivers";
import type { DriverRepository, DriverSession } from "./driver-repository";
import type { NewAssignment, NewLicense } from "./driver-records";
import { assignmentState, licenseEligible, overlaps } from "./assignment-rules";

const person = { personId: 1, firstName: "Test", lastName: "Driver", personnelNo: null, nationalCode: null, isActive: true };
const license: NewLicense = { driverId: 1, licenseType: "Heavy", licenseNo: "LIC-1", issueDate: null, expireDate: null, isActive: true };
const assignment: NewAssignment = { driverId: 1, vehicleId: 2, fromDateTime: new Date("2026-01-01T08:00:00Z"), toDateTime: null, startOdometer: "100.10", endOdometer: null, description: null };
const vehicle = { vehicleId: 2, vehicleCode: "V2", plate: "12", isActive: true };
const session = {
  person: vi.fn(), driverForPerson: vi.fn(), driver: vi.fn(), vehicle: vi.fn(), licenses: vi.fn(), licenseNumberExists: vi.fn(), overlap: vi.fn(), assignment: vi.fn(), createDriver: vi.fn(), createLicense: vi.fn(), createAssignment: vi.fn(), closeAssignment: vi.fn(),
} satisfies DriverSession;
const repository = { atomic: async <T>(work: (s: DriverSession) => Promise<T>) => work(session), list: vi.fn(), details: vi.fn(), availablePeople: vi.fn(), availableVehicles: vi.fn() } satisfies DriverRepository;
const useCase = new ManageDrivers(repository, () => new Date("2026-06-01T08:00:00Z"));
beforeEach(() => {
  vi.resetAllMocks();
  session.person.mockResolvedValue(person); session.driver.mockResolvedValue({ ...person, driverId: 1 });
  session.vehicle.mockResolvedValue(vehicle); session.licenses.mockResolvedValue([{ ...license, licenseId: 1 }]);
  session.assignment.mockResolvedValue({ ...assignment, assignmentId: 3, vehicle });
  session.createDriver.mockResolvedValue(1); session.createLicense.mockResolvedValue(2); session.createAssignment.mockResolvedValue(3);
});
const fails = (error: string) => ({ success: false, error });

describe("define driver", () => {
  it("creates only a reference to an existing active person", async () => { expect(await useCase.defineDriver(1)).toEqual({ success: true, id: 1 }); expect(session.createDriver).toHaveBeenCalledWith(1); });
  it("rejects missing people", async () => { session.person.mockResolvedValue(null); expect(await useCase.defineDriver(1)).toEqual(fails("PERSON_NOT_FOUND")); });
  it("rejects inactive people", async () => { session.person.mockResolvedValue({ ...person, isActive: false }); expect(await useCase.defineDriver(1)).toEqual(fails("PERSON_INACTIVE")); });
  it("rejects a second driver for the same person", async () => { session.driverForPerson.mockResolvedValue(true); expect(await useCase.defineDriver(1)).toEqual(fails("DRIVER_EXISTS")); expect(session.createDriver).not.toHaveBeenCalled(); });
  it.each([0, -1, 1.5, NaN, 2147483648])("rejects invalid identity %s", async id => { expect(await useCase.defineDriver(id)).toEqual(fails("INVALID_ID")); expect(session.person).not.toHaveBeenCalled(); });
});
describe("register license", () => {
  it("trims identifiers and retains inactive expired licenses", async () => {
    const input = { ...license, licenseType: " Heavy ", licenseNo: " LIC-1 ", isActive: false, issueDate: new Date("2020-01-01"), expireDate: new Date("2021-01-01") };
    expect(await useCase.addLicense(input)).toEqual({ success: true, id: 2 });
    expect(session.createLicense).toHaveBeenCalledWith({ ...input, licenseType: "Heavy", licenseNo: "LIC-1" });
  });
  it.each([
    [{ licenseType: " " }, "LICENSE_TYPE_REQUIRED"], [{ licenseType: "x".repeat(101) }, "LICENSE_TYPE_TOO_LONG"],
    [{ licenseNo: " " }, "LICENSE_NO_REQUIRED"], [{ licenseNo: "x".repeat(51) }, "LICENSE_NO_TOO_LONG"],
    [{ issueDate: new Date("invalid") }, "INVALID_DATE"], [{ issueDate: new Date("2099-01-01") }, "ISSUE_IN_FUTURE"],
    [{ issueDate: new Date("2025-01-02"), expireDate: new Date("2025-01-01") }, "EXPIRY_BEFORE_ISSUE"],
  ] as const)("rejects invalid license %o", async (change, error) => { expect(await useCase.addLicense({ ...license, ...change })).toEqual(fails(error)); expect(session.createLicense).not.toHaveBeenCalled(); });
  it("rejects duplicate license numbers across drivers", async () => { session.licenseNumberExists.mockResolvedValue(true); expect(await useCase.addLicense(license)).toEqual(fails("LICENSE_EXISTS")); });
  it("requires an existing driver", async () => { session.driver.mockResolvedValue(null); expect(await useCase.addLicense(license)).toEqual(fails("DRIVER_NOT_FOUND")); });
  it("allows multiple distinct licenses and equal issue/expiry dates", async () => { expect((await useCase.addLicense({ ...license, issueDate: new Date("2025-01-01"), expireDate: new Date("2025-01-01") })).success).toBe(true); });
});
describe("assign vehicle", () => {
  it("creates an open period with nullable license dates", async () => { expect(await useCase.assignVehicle(assignment)).toEqual({ success: true, id: 3 }); });
  it.each([
    [{ fromDateTime: new Date("invalid") }, "INVALID_DATE"], [{ toDateTime: assignment.fromDateTime }, "INVALID_PERIOD"],
    [{ startOdometer: "-1" }, "INVALID_ODOMETER"], [{ endOdometer: "1.001" }, "INVALID_ODOMETER"],
    [{ startOdometer: "10000000000000000" }, "INVALID_ODOMETER"], [{ endOdometer: "1e3" }, "INVALID_ODOMETER"],
    [{ endOdometer: "100.09" }, "ODOMETER_DECREASE"], [{ description: "x".repeat(501) }, "DESCRIPTION_TOO_LONG"],
  ] as const)("rejects invalid assignment %o", async (change, error) => { expect(await useCase.assignVehicle({ ...assignment, ...change })).toEqual(fails(error)); expect(session.createAssignment).not.toHaveBeenCalled(); });
  it("compares decimal values without losing digits", async () => { expect(await useCase.assignVehicle({ ...assignment, startOdometer: "9999999999999999.99", endOdometer: "9999999999999999.98" })).toEqual(fails("ODOMETER_DECREASE")); });
  it.each(["driver", "vehicle"] as const)("rejects %s overlap without closing another assignment", async kind => { session.overlap.mockImplementation(async (_input, by) => by === kind); expect(await useCase.assignVehicle(assignment)).toEqual(fails(kind === "driver" ? "DRIVER_OVERLAP" : "VEHICLE_OVERLAP")); expect(session.closeAssignment).not.toHaveBeenCalled(); });
  it("rejects missing driver", async () => { session.driver.mockResolvedValue(null); expect(await useCase.assignVehicle(assignment)).toEqual(fails("DRIVER_NOT_FOUND")); });
  it("rejects inactive person", async () => { session.driver.mockResolvedValue({ ...person, driverId: 1, isActive: false }); expect(await useCase.assignVehicle(assignment)).toEqual(fails("PERSON_INACTIVE")); });
  it("rejects missing vehicle", async () => { session.vehicle.mockResolvedValue(null); expect(await useCase.assignVehicle(assignment)).toEqual(fails("VEHICLE_NOT_FOUND")); });
  it("rejects inactive vehicle", async () => { session.vehicle.mockResolvedValue({ ...vehicle, isActive: false }); expect(await useCase.assignVehicle(assignment)).toEqual(fails("VEHICLE_INACTIVE")); });
  it("rejects driver without eligible license", async () => { session.licenses.mockResolvedValue([]); expect(await useCase.assignVehicle(assignment)).toEqual(fails("NO_ELIGIBLE_LICENSE")); });
});
describe("time boundaries", () => {
  const at = new Date("2026-01-01T08:00:00Z");
  it.each([
    [{ isActive: false }, false], [{ issueDate: new Date("2026-01-02") }, false], [{ expireDate: new Date("2025-12-31") }, false],
    [{ issueDate: new Date("2026-01-01"), expireDate: new Date("2026-01-01") }, true], [{ issueDate: null, expireDate: null }, true],
  ])("checks license date inclusivity %o", (change, expected) => { expect(licenseEligible({ ...license, licenseId: 1, ...change }, at)).toBe(expected); });
  it("uses Tehran calendar day for eligibility", () => { expect(licenseEligible({ ...license, licenseId: 1, issueDate: new Date("2026-01-02") }, new Date("2026-01-01T21:00:00Z"))).toBe(true); });
  it("allows touching intervals", () => { expect(overlaps({ ...assignment, toDateTime: at }, { fromDateTime: at, toDateTime: null })).toBe(false); });
  it("detects future and open overlap", () => { expect(overlaps(assignment, { fromDateTime: new Date("2099-01-01"), toDateTime: null })).toBe(true); });
  it("classifies start inclusive and end exclusive", () => {
    expect(assignmentState(assignment, at)).toBe("current");
    expect(assignmentState({ ...assignment, toDateTime: at }, at)).toBe("past");
    expect(assignmentState({ ...assignment, fromDateTime: new Date("2099-01-01") }, at)).toBe("future");
  });
});
describe("close assignment", () => {
  const end = new Date("2026-01-02T08:00:00Z");
  it("updates the same record and permits missing ending odometer", async () => { expect(await useCase.closeAssignment(3, end, null)).toEqual({ success: true, id: 3 }); expect(session.closeAssignment).toHaveBeenCalledWith(3, end, null); });
  it("rejects a missing assignment", async () => { session.assignment.mockResolvedValue(null); expect(await useCase.closeAssignment(3, end, null)).toEqual(fails("ASSIGNMENT_NOT_FOUND")); });
  it("rejects already closed periods", async () => { session.assignment.mockResolvedValue({ ...assignment, assignmentId: 3, vehicle, toDateTime: end }); expect(await useCase.closeAssignment(3, end, null)).toEqual(fails("ASSIGNMENT_CLOSED")); });
  it("rejects an equal ending time", async () => { expect(await useCase.closeAssignment(3, assignment.fromDateTime, null)).toEqual(fails("INVALID_PERIOD")); });
  it("rejects decreasing odometer", async () => { expect(await useCase.closeAssignment(3, end, "100.09")).toEqual(fails("ODOMETER_DECREASE")); });
  it("propagates unexpected storage errors", async () => { const error = new Error("unavailable"); session.closeAssignment.mockRejectedValue(error); await expect(useCase.closeAssignment(3, end, null)).rejects.toBe(error); });
});
