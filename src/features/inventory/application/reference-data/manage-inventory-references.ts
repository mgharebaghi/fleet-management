import type {
  InventoryReferenceField, InventoryReferenceResult, InventoryReferenceValidationCode,
  InventoryUnit, PartCategory, Warehouse, SaveInventoryUnit, SavePartCategory, SaveWarehouse,
} from "./inventory-reference-records";
import {
  InventoryReferenceNotFoundError, InventoryUnitInUseError, InventoryCategoryInUseError, InventoryWarehouseInUseError,
  type InventoryReferenceRepository, type InventoryReferenceWriteSession,
} from "./inventory-reference-repository";

type FieldErrors = Partial<Record<InventoryReferenceField, InventoryReferenceValidationCode>>;
const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2_147_483_647;
const optionalText = (value: string | null) => value?.trim() || null;

function validateText(errors: FieldErrors, field: InventoryReferenceField, value: string | null, maximum: number, required = false) {
  if (required && !value) errors[field] = "REQUIRED";
  else if (value && value.length > maximum) errors[field] = "TOO_LONG";
}

function validateId(errors: FieldErrors, id: number | null) {
  if (id !== null && !validId(id)) errors.id = "INVALID_ID";
}

export class ManageInventoryReferences {
  constructor(private readonly repository: InventoryReferenceRepository) {}

  private async write<T>(work: (session: InventoryReferenceWriteSession) => Promise<InventoryReferenceResult<T>>): Promise<InventoryReferenceResult<T>> {
    try { return await this.repository.atomic(work); }
    catch (error) {
      if (error instanceof InventoryReferenceNotFoundError) return { success: false, error: { type: "NOT_FOUND" } };
      if (error instanceof InventoryUnitInUseError) return { success: false, error: { type: "UNIT_IN_USE" } };
      if (error instanceof InventoryCategoryInUseError) return { success: false, error: { type: "CATEGORY_IN_USE" } };
      if (error instanceof InventoryWarehouseInUseError) return { success: false, error: { type: "WAREHOUSE_IN_USE" } };
      throw error;
    }
  }

  async saveUnit(input: SaveInventoryUnit): Promise<InventoryReferenceResult<InventoryUnit>> {
    const value = { ...input, name: input.name.trim(), symbol: optionalText(input.symbol) };
    const fields: FieldErrors = {};
    validateId(fields, value.id);
    validateText(fields, "name", value.name, 50, true);
    validateText(fields, "symbol", value.symbol, 20);
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.write(async session => {
      if (value.id !== null && !await session.unit(value.id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.unitNameExists(value.name, value.id)) return { success: false, error: { type: "DUPLICATE_NAME" } };
      return { success: true, value: await session.saveUnit(value) };
    });
  }

  async deleteUnit(id: number): Promise<InventoryReferenceResult<number>> {
    if (!validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID_ID" } } };
    return this.write(async session => {
      if (!await session.unit(id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.unitIsUsed(id)) return { success: false, error: { type: "UNIT_IN_USE" } };
      await session.deleteUnit(id);
      return { success: true, value: id };
    });
  }

  async deleteCategory(id: number): Promise<InventoryReferenceResult<number>> {
    if (!validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID_ID" } } };
    return this.write(async session => {
      if (!await session.category(id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.categoryIsUsed(id)) return { success: false, error: { type: "CATEGORY_IN_USE" } };
      await session.deleteCategory(id);
      return { success: true, value: id };
    });
  }

  async saveCategory(input: SavePartCategory): Promise<InventoryReferenceResult<PartCategory>> {
    const value = { ...input, name: input.name.trim() };
    const fields: FieldErrors = {};
    validateId(fields, value.id);
    validateText(fields, "name", value.name, 100, true);
    if (typeof value.isActive !== "boolean") fields.isActive = "INVALID_BOOLEAN";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.write(async session => {
      if (value.id !== null && !await session.category(value.id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.categoryNameExists(value.name, value.id)) return { success: false, error: { type: "DUPLICATE_NAME" } };
      return { success: true, value: await session.saveCategory(value) };
    });
  }

  async saveWarehouse(input: SaveWarehouse): Promise<InventoryReferenceResult<Warehouse>> {
    const value = { ...input, code: input.code.trim(), name: input.name.trim(), location: optionalText(input.location) };
    const fields: FieldErrors = {};
    validateId(fields, value.id);
    validateText(fields, "code", value.code, 50, true);
    validateText(fields, "name", value.name, 150, true);
    validateText(fields, "location", value.location, 500);
    if (typeof value.isActive !== "boolean") fields.isActive = "INVALID_BOOLEAN";
    if (Object.keys(fields).length) return { success: false, error: { type: "VALIDATION_ERROR", fields } };
    return this.write(async session => {
      if (value.id !== null && !await session.warehouse(value.id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.warehouseCodeExists(value.code, value.id)) return { success: false, error: { type: "DUPLICATE_CODE" } };
      return { success: true, value: await session.saveWarehouse(value) };
    });
  }

  async deleteWarehouse(id: number): Promise<InventoryReferenceResult<number>> {
    if (!validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID_ID" } } };
    return this.write(async session => {
      if (!await session.warehouse(id)) return { success: false, error: { type: "NOT_FOUND" } };
      if (await session.warehouseIsUsed(id)) return { success: false, error: { type: "WAREHOUSE_IN_USE" } };
      await session.deleteWarehouse(id);
      return { success: true, value: id };
    });
  }

  async setWarehouseActive(id: number, isActive: boolean): Promise<InventoryReferenceResult<Warehouse>> {
    if (!validId(id)) return { success: false, error: { type: "VALIDATION_ERROR", fields: { id: "INVALID_ID" } } };
    if (typeof isActive !== "boolean") return { success: false, error: { type: "VALIDATION_ERROR", fields: { isActive: "INVALID_BOOLEAN" } } };
    return this.write(async session => {
      if (!await session.warehouse(id)) return { success: false, error: { type: "NOT_FOUND" } };
      return { success: true, value: await session.setWarehouseActive(id, isActive) };
    });
  }
}
