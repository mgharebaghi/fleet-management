import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageMaintenanceReferences } from "./manage-maintenance-references";
import { MaintenanceTypeCapacityError, MaintenanceCodeConflictError, MaintenanceTypeInUseError, type MaintenanceReferenceRepository, type MaintenanceReferenceWriteSession } from "./maintenance-reference-repository";
const type = { id: 1, code: "SERVICE", name: "Service", description: null, isActive: true };
const workshop = { id: 2, name: "Workshop", workshopType: "Any free text", isInternal: false, address: null, phone: null, contactPerson: null, description: null, isActive: true };
const technician = { id: 3, workshopId: 2, firstName: "First", lastName: "Last", mobile: null, specialty: null, description: null, isActive: true, workshopName: "Workshop", workshopActive: true };
const session = { type: vi.fn(), typeIsUsed: vi.fn(), deleteType: vi.fn(), typeCodeExists: vi.fn(), saveType: vi.fn(), workshop: vi.fn(), saveWorkshop: vi.fn(), technician: vi.fn(), saveTechnician: vi.fn() } satisfies MaintenanceReferenceWriteSession;
const repository = { atomic: vi.fn(), types: vi.fn(), type: vi.fn(), workshops: vi.fn(), workshop: vi.fn(), workshopOptions: vi.fn(), technicians: vi.fn(), technician: vi.fn() } satisfies MaintenanceReferenceRepository;
const manage = new ManageMaintenanceReferences(repository);
beforeEach(() => {
  vi.resetAllMocks(); repository.atomic.mockImplementation(work => work(session));
  session.type.mockResolvedValue(type); session.workshop.mockResolvedValue(workshop); session.technician.mockResolvedValue(technician);
  session.saveType.mockResolvedValue(type); session.saveWorkshop.mockResolvedValue(workshop); session.saveTechnician.mockResolvedValue(technician);
});
describe("maintenance reference rules", () => {
  it("deletes only unused types and rejects stale or malformed requests", async () => {
    expect(await manage.deleteType(1)).toEqual({ success: true, value: 1 });
    expect(session.deleteType).toHaveBeenCalledWith(1);
    session.deleteType.mockClear(); session.typeIsUsed.mockResolvedValue(true);
    expect(await manage.deleteType(1)).toEqual({ success: false, error: { type: "TYPE_IN_USE" } });
    expect(session.deleteType).not.toHaveBeenCalled();
    session.type.mockResolvedValue(null);
    expect(await manage.deleteType(1)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    repository.atomic.mockClear(); expect((await manage.deleteType(256)).success).toBe(false);
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("maps a final FK guard to a typed used-reference failure", async () => {
    session.deleteType.mockRejectedValue(new MaintenanceTypeInUseError());
    expect(await manage.deleteType(1)).toEqual({ success: false, error: { type: "TYPE_IN_USE" } });
  });
  it("normalizes text and rejects duplicate codes including persistence races", async () => {
    expect((await manage.saveType({ ...type, code: " SERVICE ", description: " " })).success).toBe(true);
    expect(session.saveType).toHaveBeenCalledWith({ ...type, description: null });
    session.typeCodeExists.mockResolvedValue(true);
    expect(await manage.saveType(type)).toEqual({ success: false, error: { type: "DUPLICATE_CODE" } });
    session.typeCodeExists.mockResolvedValue(false); session.saveType.mockRejectedValue(new MaintenanceCodeConflictError());
    expect(await manage.saveType(type)).toEqual({ success: false, error: { type: "DUPLICATE_CODE" } });
  });
  it("reports exhausted type IDs as a typed failure", async () => {
    session.saveType.mockRejectedValue(new MaintenanceTypeCapacityError());
    expect(await manage.saveType({ ...type, id: null })).toEqual({ success: false, error: { type: "TYPE_CAPACITY" } });
  });
  it.each([{ ...type, id: 256 }, { ...type, code: "" }, { ...type, name: "x".repeat(101) }, { ...type, description: "x".repeat(501) }, { ...type, isActive: "false" as unknown as boolean }])("rejects invalid type values before opening a transaction", async input => {
    expect((await manage.saveType(input)).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("accepts free workshop classifications, homonymous workshops and independent technicians", async () => {
    expect((await manage.saveWorkshop({ ...workshop, phone: "۰۲۱۱۲۳", description: " " })).success).toBe(true);
    expect(session.saveWorkshop).toHaveBeenCalledWith({ ...workshop, phone: "021123", description: null });
    expect((await manage.saveTechnician({ ...technician, id: null, workshopId: null, mobile: "۰۹۱۲۳" })).success).toBe(true);
    expect(session.saveTechnician).toHaveBeenCalledWith(expect.objectContaining({ workshopId: null, mobile: "09123" }));
  });
  it("rejects required, length and boolean errors for workshops and technicians", async () => {
    expect((await manage.saveWorkshop({ ...workshop, name: " ", workshopType: "", phone: "x".repeat(51), address: "x".repeat(501), description: "x".repeat(1001), isInternal: "false" as unknown as boolean })).success).toBe(false);
    expect((await manage.saveTechnician({ ...technician, firstName: "", lastName: "x".repeat(101), mobile: "x".repeat(21), specialty: "x".repeat(151), description: "x".repeat(1001), workshopId: -1 })).success).toBe(false);
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("rejects inactive or missing new workshop assignments but retains an existing inactive affiliation", async () => {
    session.workshop.mockResolvedValue({ ...workshop, isActive: false });
    expect(await manage.saveTechnician({ ...technician, id: null })).toEqual({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
    expect((await manage.saveTechnician(technician)).success).toBe(true);
    session.workshop.mockResolvedValue(null);
    expect(await manage.saveTechnician(technician)).toEqual({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
  });
  it("preserves existing rows on stale update requests", async () => {
    session.type.mockResolvedValue(null); session.workshop.mockResolvedValue(null); session.technician.mockResolvedValue(null);
    for (const result of [await manage.saveType(type), await manage.saveWorkshop(workshop), await manage.saveTechnician(technician)]) expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    expect(session.saveType).not.toHaveBeenCalled(); expect(session.saveWorkshop).not.toHaveBeenCalled(); expect(session.saveTechnician).not.toHaveBeenCalled();
  });
  it("keeps inactive records readable, normalizes filters and rejects malformed IDs before reads", async () => {
    await manage.types({ search: "  كد ۱۲ ", active: "all", page: 0 });
    expect(repository.types).toHaveBeenCalledWith({ search: "کد 12", active: "all", page: 1 });
    expect(await manage.type(256)).toBeNull(); expect(await manage.workshop(NaN)).toBeNull(); expect(await manage.technician(-1)).toBeNull();
    expect(repository.type).not.toHaveBeenCalled();
  });
});
