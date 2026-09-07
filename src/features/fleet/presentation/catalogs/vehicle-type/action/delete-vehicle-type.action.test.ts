import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeleteCatalogEntryResult } from "../../../../application/catalogs/delete-catalog-entry/delete-catalog-entry.contract";
import { initialDeleteCatalogEntryActionState } from "../../delete-catalog-entry/delete-catalog-entry.action-state";
import { deleteVehicleTypeAction } from "./delete-vehicle-type.action";

const { executeDeleteVehicleType, makeDeleteVehicleType, revalidatePath } =
  vi.hoisted(() => ({
    executeDeleteVehicleType: vi.fn(),
    makeDeleteVehicleType: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-type.factory", () => ({
  makeDeleteVehicleType,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

function createFormData(id: string): FormData {
  const formData = new FormData();
  formData.set("id", id);
  return formData;
}

describe("deleteVehicleTypeAction", () => {
  beforeEach(() => {
    executeDeleteVehicleType.mockReset();
    makeDeleteVehicleType.mockReset();
    makeDeleteVehicleType.mockReturnValue({
      execute: executeDeleteVehicleType,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful delete", async () => {
    executeDeleteVehicleType.mockResolvedValue({
      success: true,
    } satisfies DeleteCatalogEntryResult);

    const actionState = await deleteVehicleTypeAction(
      initialDeleteCatalogEntryActionState,
      createFormData("1"),
    );

    expect(executeDeleteVehicleType).toHaveBeenCalledWith(1);
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the id is missing", async () => {
    const actionState = await deleteVehicleTypeAction(
      initialDeleteCatalogEntryActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeDeleteVehicleType).not.toHaveBeenCalled();
  });

  it("reports in_use without revalidating when the entry is still referenced", async () => {
    executeDeleteVehicleType.mockResolvedValue({
      success: false,
      error: { type: "IN_USE" },
    } satisfies DeleteCatalogEntryResult);

    const actionState = await deleteVehicleTypeAction(
      initialDeleteCatalogEntryActionState,
      createFormData("1"),
    );

    expect(actionState).toEqual({ status: "in_use" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates but reports not_found when the entry was already removed", async () => {
    executeDeleteVehicleType.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies DeleteCatalogEntryResult);

    const actionState = await deleteVehicleTypeAction(
      initialDeleteCatalogEntryActionState,
      createFormData("1"),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
  });
});
