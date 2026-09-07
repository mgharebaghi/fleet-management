import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateCatalogEntryResult } from "../../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";
import type { FuelType } from "../../../../application/catalogs/fuel-type";
import { initialUpdateCatalogEntryActionState } from "../../update-catalog-entry/update-catalog-entry.action-state";
import { updateFuelTypeAction } from "./update-fuel-type.action";

const { executeUpdateFuelType, makeUpdateFuelType, revalidatePath } =
  vi.hoisted(() => ({
    executeUpdateFuelType: vi.fn(),
    makeUpdateFuelType: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/fuel-type.factory", () => ({
  makeUpdateFuelType,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const updatedFuelType: FuelType = {
  id: 1,
  name: "Volvo XL",
  isActive: true,
};

function createFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("updateFuelTypeAction", () => {
  beforeEach(() => {
    executeUpdateFuelType.mockReset();
    makeUpdateFuelType.mockReset();
    makeUpdateFuelType.mockReturnValue({
      execute: executeUpdateFuelType,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful update", async () => {
    executeUpdateFuelType.mockResolvedValue({
      success: true,
      entry: updatedFuelType,
    } satisfies UpdateCatalogEntryResult<FuelType>);

    const actionState = await updateFuelTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({
        id: "1",
        name: "Volvo XL",
        supportsActive: "true",
        isActive: "on",
      }),
    );

    expect(executeUpdateFuelType).toHaveBeenCalledWith({
      id: 1,
      name: "Volvo XL",
      isActive: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the id is missing", async () => {
    const actionState = await updateFuelTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ name: "Volvo XL", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeUpdateFuelType).not.toHaveBeenCalled();
  });

  it("maps a duplicate name error from the use case without revalidating", async () => {
    executeUpdateFuelType.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies UpdateCatalogEntryResult<FuelType>);

    const actionState = await updateFuelTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "Volvo", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates but reports not_found when the entry was already removed", async () => {
    executeUpdateFuelType.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies UpdateCatalogEntryResult<FuelType>);

    const actionState = await updateFuelTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "Volvo", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
  });
});
