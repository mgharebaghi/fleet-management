import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateCatalogEntryResult } from "../../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";
import type { VehicleStatusEntry } from "../../../../application/catalogs/vehicle-status";
import { initialUpdateCatalogEntryActionState } from "../../update-catalog-entry/update-catalog-entry.action-state";
import { updateVehicleStatusAction } from "./update-vehicle-status.action";

const { executeUpdateVehicleStatus, makeUpdateVehicleStatus, revalidatePath } =
  vi.hoisted(() => ({
    executeUpdateVehicleStatus: vi.fn(),
    makeUpdateVehicleStatus: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-status.factory", () => ({
  makeUpdateVehicleStatus,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const updatedVehicleStatus: VehicleStatusEntry = {
  id: 1,
  name: "در حال تعمیر",
};

function createFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("updateVehicleStatusAction", () => {
  beforeEach(() => {
    executeUpdateVehicleStatus.mockReset();
    makeUpdateVehicleStatus.mockReset();
    makeUpdateVehicleStatus.mockReturnValue({
      execute: executeUpdateVehicleStatus,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful update, without an isActive field", async () => {
    executeUpdateVehicleStatus.mockResolvedValue({
      success: true,
      entry: updatedVehicleStatus,
    } satisfies UpdateCatalogEntryResult<VehicleStatusEntry>);

    const actionState = await updateVehicleStatusAction(
      initialUpdateCatalogEntryActionState,
      // VehicleStatus has no IsActive column, so its edit form never
      // renders the checkbox and always sends supportsActive="false".
      createFormData({
        id: "1",
        name: "در حال تعمیر",
        supportsActive: "false",
      }),
    );

    expect(executeUpdateVehicleStatus).toHaveBeenCalledWith({
      id: 1,
      name: "در حال تعمیر",
      isActive: undefined,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the id is missing", async () => {
    const actionState = await updateVehicleStatusAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ name: "در حال تعمیر", supportsActive: "false" }),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeUpdateVehicleStatus).not.toHaveBeenCalled();
  });

  it("maps a duplicate name error from the use case without revalidating", async () => {
    executeUpdateVehicleStatus.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies UpdateCatalogEntryResult<VehicleStatusEntry>);

    const actionState = await updateVehicleStatusAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "فعال", supportsActive: "false" }),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates but reports not_found when the entry was already removed", async () => {
    executeUpdateVehicleStatus.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies UpdateCatalogEntryResult<VehicleStatusEntry>);

    const actionState = await updateVehicleStatusAction(
      initialUpdateCatalogEntryActionState,
      createFormData({ id: "1", name: "فعال", supportsActive: "false" }),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
  });
});
