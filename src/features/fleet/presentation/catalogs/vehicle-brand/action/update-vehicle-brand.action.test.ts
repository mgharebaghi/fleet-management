import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateCatalogEntryResult } from "../../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";
import type { VehicleBrand } from "../../../../application/catalogs/vehicle-brand";
import { initialUpdateCatalogEntryActionState } from "../../update-catalog-entry/update-catalog-entry.action-state";
import { updateVehicleBrandAction } from "./update-vehicle-brand.action";

const { executeUpdateVehicleBrand, makeUpdateVehicleBrand, revalidatePath } =
  vi.hoisted(() => ({
    executeUpdateVehicleBrand: vi.fn(),
    makeUpdateVehicleBrand: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-brand.factory", () => ({
  makeUpdateVehicleBrand,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const updatedVehicleBrand: VehicleBrand = {
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

describe("updateVehicleBrandAction", () => {
  beforeEach(() => {
    executeUpdateVehicleBrand.mockReset();
    makeUpdateVehicleBrand.mockReset();
    makeUpdateVehicleBrand.mockReturnValue({
      execute: executeUpdateVehicleBrand,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful update", async () => {
    executeUpdateVehicleBrand.mockResolvedValue({
      success: true,
      entry: updatedVehicleBrand,
    } satisfies UpdateCatalogEntryResult<VehicleBrand>);

    const actionState = await updateVehicleBrandAction(
      initialUpdateCatalogEntryActionState,
      createFormData({
        id: "1",
        name: "Volvo XL",
        supportsActive: "true",
        isActive: "on",
      }),
    );

    expect(executeUpdateVehicleBrand).toHaveBeenCalledWith({
      id: 1,
      name: "Volvo XL",
      isActive: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the id is missing", async () => {
    const actionState = await updateVehicleBrandAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ name: "Volvo XL", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeUpdateVehicleBrand).not.toHaveBeenCalled();
  });

  it("maps a duplicate name error from the use case without revalidating", async () => {
    executeUpdateVehicleBrand.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies UpdateCatalogEntryResult<VehicleBrand>);

    const actionState = await updateVehicleBrandAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "Volvo", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates but reports not_found when the entry was already removed", async () => {
    executeUpdateVehicleBrand.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies UpdateCatalogEntryResult<VehicleBrand>);

    const actionState = await updateVehicleBrandAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "Volvo", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
  });
});
