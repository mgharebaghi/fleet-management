import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateCatalogEntryResult } from "../../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";
import type { VehicleType } from "../../../../application/catalogs/vehicle-type";
import { initialUpdateCatalogEntryActionState } from "../../update-catalog-entry/update-catalog-entry.action-state";
import { updateVehicleTypeAction } from "./update-vehicle-type.action";

const { executeUpdateVehicleType, makeUpdateVehicleType, revalidatePath } =
  vi.hoisted(() => ({
    executeUpdateVehicleType: vi.fn(),
    makeUpdateVehicleType: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-type.factory", () => ({
  makeUpdateVehicleType,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const updatedVehicleType: VehicleType = {
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

describe("updateVehicleTypeAction", () => {
  beforeEach(() => {
    executeUpdateVehicleType.mockReset();
    makeUpdateVehicleType.mockReset();
    makeUpdateVehicleType.mockReturnValue({
      execute: executeUpdateVehicleType,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful update", async () => {
    executeUpdateVehicleType.mockResolvedValue({
      success: true,
      entry: updatedVehicleType,
    } satisfies UpdateCatalogEntryResult<VehicleType>);

    const actionState = await updateVehicleTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({
        id: "1",
        name: "Volvo XL",
        supportsActive: "true",
        isActive: "on",
      }),
    );

    expect(executeUpdateVehicleType).toHaveBeenCalledWith({
      id: 1,
      name: "Volvo XL",
      isActive: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the id is missing", async () => {
    const actionState = await updateVehicleTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ name: "Volvo XL", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeUpdateVehicleType).not.toHaveBeenCalled();
  });

  it("maps a duplicate name error from the use case without revalidating", async () => {
    executeUpdateVehicleType.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies UpdateCatalogEntryResult<VehicleType>);

    const actionState = await updateVehicleTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "Volvo", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates but reports not_found when the entry was already removed", async () => {
    executeUpdateVehicleType.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies UpdateCatalogEntryResult<VehicleType>);

    const actionState = await updateVehicleTypeAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "Volvo", supportsActive: "true" }),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
  });
});
