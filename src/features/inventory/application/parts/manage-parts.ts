import { normalizePersianNumerals, normalizePersianSearchText } from "../../../../shared/text/persian-text";
import type { PartFailure, PartInput, PartResult, PartSearch } from "./part-records";
import { PartInUseError, type PartRepository } from "./part-repository";
const idValid = (id: number) => Number.isInteger(id) && id > 0 && id <= 2_147_483_647;
const decimalValid = (text: string) => /^\d+(\.\d{1,2})?$/.test(text) && text.split(".")[0].replace(/^0+/, "").length <= 16;
const emptyToNull = (text: string | null) => text?.trim() || null;

export class ManageParts {
  constructor(private readonly repository: PartRepository) {}
  async delete(id: number): Promise<PartResult> {
    if (!idValid(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID" } } };
    try {
      return await this.repository.atomic(async session => {
        if (!await session.part(id)) return { success: false, error: { type: "NOT_FOUND" } };
        if (await session.hasReferences(id)) return { success: false, error: { type: "PART_IN_USE" } };
        await session.delete(id);
        return { success: true, id };
      });
    } catch (error) {
      if (error instanceof PartInUseError) return { success: false, error: { type: "PART_IN_USE" } };
      throw error;
    }
  }
  get(id: number) { return idValid(id) ? this.repository.get(id) : Promise.resolve(null); }
  list(criteria: PartSearch) {
    return this.repository.list({ search: normalizePersianSearchText(criteria.search.trim()), active: criteria.active === "all" || criteria.active === "inactive" ? criteria.active : "active", page: Number.isSafeInteger(criteria.page) && criteria.page > 0 ? Math.min(criteria.page, 1_000_000) : 1 });
  }
  async save(input: PartInput): Promise<PartResult> {
    const value = { ...input, code: input.code.trim(), name: input.name.trim(), partNumber: emptyToNull(input.partNumber), manufacturer: emptyToNull(input.manufacturer) };
    const fields: Extract<PartFailure, { type: "VALIDATION_ERROR" }>["fields"] = {};
    for (const [field, maximum] of [["code", 50], ["name", 150], ["partNumber", 100], ["manufacturer", 100]] as const) {
      if ((field === "code" || field === "name") && !value[field]) fields[field] = "REQUIRED";
      else if ((value[field]?.length ?? 0) > maximum) fields[field] = "TOO_LONG";
    }
    if (value.id !== null && !idValid(value.id)) fields.id = "INVALID";
    if (!idValid(value.unitId)) fields.unitId = "INVALID";
    if (value.categoryId !== null && !idValid(value.categoryId)) fields.categoryId = "INVALID";
    if (typeof value.isActive !== "boolean") fields.isActive = "INVALID";
    for (const field of ["minStock", "maxStock", "reorderPoint"] as const) {
      value[field] = emptyToNull(value[field]);
      if (value[field] !== null) {
        value[field] = normalizePersianNumerals(value[field]).replace(/٫/g, ".");
        if (!decimalValid(value[field])) fields[field] = "INVALID";
      }
    }
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.repository.atomic(async session => {
      const existing = value.id === null ? null : await session.part(value.id);
      if (value.id !== null && !existing) return { success: false, error: { type: "NOT_FOUND" } };
      if (existing?.isUsed && existing.unitId !== value.unitId) return { success: false, error: { type: "UNIT_IN_USE" } };
      if (await session.codeExists(value.code, value.id)) return { success: false, error: { type: "DUPLICATE_CODE" } };
      if (!await session.unitExists(value.unitId)) return { success: false, error: { type: "UNIT_NOT_FOUND" } };
      if (value.categoryId !== null) {
        const category = await session.category(value.categoryId);
        if (!category || (!category.isActive && value.categoryId !== existing?.categoryId)) return { success: false, error: { type: "CATEGORY_UNAVAILABLE" } };
      }
      return { success: true, id: await session.save(value) };
    });
  }
}
