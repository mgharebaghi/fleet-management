import { normalizePersianNumerals, normalizePersianSearchText } from "../../../../shared/text/persian-text";
import type { ReferenceFailure, ReferenceResult, ReferenceSearch, SaveMaintenanceType, SaveWorkshop, SaveTechnician } from "./maintenance-reference-records";
import { MaintenanceTypeCapacityError, MaintenanceCodeConflictError, MaintenanceReferenceMissingError, MaintenanceTypeInUseError, type MaintenanceReferenceRepository, type MaintenanceReferenceWriteSession } from "./maintenance-reference-repository";

const validId = (id: number, maximum = 2147483647) => Number.isInteger(id) && id > 0 && id <= maximum;
const text = (value: string | null) => value?.trim() || null;
type Fields = Extract<ReferenceFailure, { type: "VALIDATION_ERROR" }>["fields"];
function check(fields: Fields, field: string, value: string | null, maximum: number, required = false) {
  if (required && !value) fields[field] = "REQUIRED";
  else if (value && value.length > maximum) fields[field] = "TOO_LONG";
}
function identity(fields: Fields, id: number | null, active: boolean, maximum?: number) {
  if (id !== null && !validId(id, maximum)) fields.id = "INVALID";
  if (typeof active !== "boolean") fields.isActive = "INVALID";
}
export function normalizeReferenceSearch(value: ReferenceSearch): ReferenceSearch {
  return { search: normalizePersianSearchText(value.search.trim()), active: value.active === "all" || value.active === "inactive" ? value.active : "active", page: Number.isSafeInteger(value.page) && value.page > 0 ? Math.min(value.page, 1000000) : 1 };
}

export class ManageMaintenanceReferences {
  constructor(private readonly repository: MaintenanceReferenceRepository) {}
  types(search: ReferenceSearch) { return this.repository.types(normalizeReferenceSearch(search)); }
  workshops(search: ReferenceSearch) { return this.repository.workshops(normalizeReferenceSearch(search)); }
  technicians(search: ReferenceSearch) { return this.repository.technicians(normalizeReferenceSearch(search)); }
  type(id: number) { return validId(id, 255) ? this.repository.type(id) : Promise.resolve(null); }
  workshop(id: number) { return validId(id) ? this.repository.workshop(id) : Promise.resolve(null); }
  technician(id: number) { return validId(id) ? this.repository.technician(id) : Promise.resolve(null); }
  workshopOptions() { return this.repository.workshopOptions(); }
  private async write<T>(work: (session: MaintenanceReferenceWriteSession) => Promise<ReferenceResult<T>>): Promise<ReferenceResult<T>> {
    try { return await this.repository.atomic(work); }
    catch (error) {
      if (error instanceof MaintenanceTypeCapacityError) return { success: false, error: { type: "TYPE_CAPACITY" } };
      if (error instanceof MaintenanceCodeConflictError) return { success: false, error: { type: "DUPLICATE_CODE" } };
      if (error instanceof MaintenanceReferenceMissingError) return { success: false, error: { type: "NOT_FOUND" } };
      if (error instanceof MaintenanceTypeInUseError) return { success: false, error: { type: "TYPE_IN_USE" } };
      throw error;
    }
  }
  async deleteType(id: number): Promise<ReferenceResult<number>> {
    if (!validId(id, 255)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID" } } };
    return this.write(async session => {
      if (!await session.type(id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.typeIsUsed(id)) return { success: false, error: { type: "TYPE_IN_USE" } };
      await session.deleteType(id);
      return { success: true, value: id };
    });
  }
  async saveType(input: SaveMaintenanceType) {
    const value = { ...input, code: input.code.trim(), name: input.name.trim(), description: text(input.description) };
    const fields: Fields = {}; identity(fields, value.id, value.isActive, 255);
    check(fields, "code", value.code, 50, true); check(fields, "name", value.name, 100, true); check(fields, "description", value.description, 500);
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } } as const;
    return this.write(async session => {
      if (value.id !== null && !await session.type(value.id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.typeCodeExists(value.code, value.id)) return { success: false, error: { type: "DUPLICATE_CODE" } };
      return { success: true, value: await session.saveType(value) };
    });
  }
  async saveWorkshop(input: SaveWorkshop) {
    const value = { ...input, name: input.name.trim(), workshopType: input.workshopType.trim(), address: text(input.address), phone: text(input.phone) && normalizePersianNumerals(input.phone!.trim()), contactPerson: text(input.contactPerson), description: text(input.description) };
    const fields: Fields = {}; identity(fields, value.id, value.isActive);
    if (typeof value.isInternal !== "boolean") fields.isInternal = "INVALID";
    check(fields, "name", value.name, 150, true); check(fields, "workshopType", value.workshopType, 50, true);
    check(fields, "address", value.address, 500); check(fields, "phone", value.phone, 50); check(fields, "contactPerson", value.contactPerson, 150); check(fields, "description", value.description, 1000);
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } } as const;
    return this.write(async session => {
      if (value.id !== null && !await session.workshop(value.id)) return { success: false, error: { type: "NOT_FOUND" } };
      return { success: true, value: await session.saveWorkshop(value) };
    });
  }
  async saveTechnician(input: SaveTechnician) {
    const value = { ...input, firstName: input.firstName.trim(), lastName: input.lastName.trim(), mobile: text(input.mobile) && normalizePersianNumerals(input.mobile!.trim()), specialty: text(input.specialty), description: text(input.description) };
    const fields: Fields = {}; identity(fields, value.id, value.isActive);
    if (value.workshopId !== null && !validId(value.workshopId)) fields.workshopId = "INVALID";
    check(fields, "firstName", value.firstName, 100, true); check(fields, "lastName", value.lastName, 100, true);
    check(fields, "mobile", value.mobile, 20); check(fields, "specialty", value.specialty, 150); check(fields, "description", value.description, 1000);
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } } as const;
    return this.write(async session => {
      const existing = value.id === null ? null : await session.technician(value.id);
      if (value.id !== null && !existing) return { success: false, error: { type: "NOT_FOUND" } };
      if (value.workshopId !== null) {
        const workshop = await session.workshop(value.workshopId);
        if (!workshop || (!workshop.isActive && existing?.workshopId !== value.workshopId)) return { success: false, error: { type: "WORKSHOP_UNAVAILABLE" } };
      }
      return { success: true, value: await session.saveTechnician(value) };
    });
  }
}
