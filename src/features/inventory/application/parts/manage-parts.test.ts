import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageParts } from "./manage-parts";
import type { PartInput } from "./part-records";
import { PartInUseError } from "./part-repository";
const session = { part: vi.fn(), hasReferences: vi.fn(), delete: vi.fn(), codeExists: vi.fn(), unitExists: vi.fn(), category: vi.fn(), save: vi.fn() };
const repository = { atomic: vi.fn(), get: vi.fn(), list: vi.fn() };
const manage = new ManageParts(repository);
const input: PartInput = { id: null, code: "P1", name: "Filter", unitId: 1, categoryId: null, partNumber: null, manufacturer: null, minStock: null, maxStock: null, reorderPoint: null, isActive: true };
beforeEach(() => { vi.resetAllMocks(); repository.atomic.mockImplementation(work => work(session)); session.part.mockResolvedValue({ unitId: 1, categoryId: 2, isUsed: false }); session.codeExists.mockResolvedValue(false); session.unitExists.mockResolvedValue(true); session.category.mockResolvedValue({ isActive: true }); session.save.mockResolvedValue(7); });
describe("part management", () => {
  it("deletes only an existing unused part and preserves references", async () => {
    session.hasReferences.mockResolvedValue(true);
    expect(await manage.delete(7)).toEqual({ success: false, error: { type: "PART_IN_USE" } });
    expect(session.delete).not.toHaveBeenCalled();
    session.hasReferences.mockResolvedValue(false);
    expect(await manage.delete(7)).toEqual({ success: true, id: 7 });
    session.part.mockResolvedValue(null);
    expect(await manage.delete(7)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it("validates deletion IDs and maps the final FK guard", async () => {
    expect((await manage.delete(0)).success).toBe(false);
    expect(repository.atomic).not.toHaveBeenCalled();
    repository.atomic.mockRejectedValueOnce(new PartInUseError());
    expect(await manage.delete(7)).toEqual({ success: false, error: { type: "PART_IN_USE" } });
  });
  it("normalizes text and Persian decimals without converting them to numbers", async () => {
    expect(await manage.save({ ...input, code: " P1 ", minStock: " ۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹ " })).toEqual({ success: true, id: 7 });
    expect(session.save).toHaveBeenCalledWith(expect.objectContaining({ code: "P1", minStock: "9999999999999999.99" }));
  });
  it.each(["-1", "0.001", "10000000000000000", "1e3", "bad"])("rejects an invalid threshold %s before persistence", async value => {
    expect((await manage.save({ ...input, minStock: value })).success).toBe(false);
    expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("checks exact SQL bounds, identifiers and required fields", async () => {
    const result = await manage.save({ ...input, name: " ", code: "x".repeat(51), manufacturer: "x".repeat(101), unitId: 0 });
    expect(result.success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("rejects duplicate codes and missing references", async () => {
    session.codeExists.mockResolvedValueOnce(true);
    expect(await manage.save(input)).toEqual({ success: false, error: { type: "DUPLICATE_CODE" } });
    session.unitExists.mockResolvedValue(false);
    expect(await manage.save(input)).toEqual({ success: false, error: { type: "UNIT_NOT_FOUND" } });
    expect(session.save).not.toHaveBeenCalled();
  });
  it("retains an inactive current category but forbids selecting another inactive category", async () => {
    session.category.mockResolvedValue({ isActive: false });
    expect((await manage.save({ ...input, id: 7, categoryId: 2 })).success).toBe(true);
    expect(await manage.save({ ...input, id: 7, categoryId: 3 })).toEqual({ success: false, error: { type: "CATEGORY_UNAVAILABLE" } });
  });
  it("blocks a used part's unit change while permitting its other edits", async () => {
    session.part.mockResolvedValue({ unitId: 1, categoryId: null, isUsed: true });
    expect(await manage.save({ ...input, id: 7, unitId: 2 })).toEqual({ success: false, error: { type: "UNIT_IN_USE" } });
    expect((await manage.save({ ...input, id: 7, name: "Updated" })).success).toBe(true);
  });
  it("does not recreate a missing part or read an invalid identifier", async () => {
    session.part.mockResolvedValue(null);
    expect(await manage.save({ ...input, id: 7 })).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    expect(await manage.get(0)).toBeNull(); expect(repository.get).not.toHaveBeenCalled();
  });
});
