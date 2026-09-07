import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeleteCatalogEntryResult } from "../../../../application/catalogs/delete-catalog-entry/delete-catalog-entry.contract";
import { initialDeleteCatalogEntryActionState } from "../../delete-catalog-entry/delete-catalog-entry.action-state";
import { deleteVehicleStatusAction } from "./delete-vehicle-status.action";

const { executeDeleteVehicleStatus, makeDeleteVehicleStatus, revalidatePath } =
  vi.hoisted(() => ({
    executeDeleteVehicleStatus: vi.fn(),
    makeDeleteVehicleStatus: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-status.factory", () => ({
  makeDeleteVehicleStatus,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

function createFormData(id: string): FormData {
  const formData = new FormData();
  formData.set("id", id);
  return formData;
}

describe("deleteVehicleStatusAction", () => {
  beforeEach(() => {
    executeDeleteVehicleStatus.mockReset();
    makeDeleteVehicleStatus.mockReset();
    makeDeleteVehicleStatus.mockReturnValue({
      execute: executeDeleteVehicleStatus,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful delete", async () => {
    executeDeleteVehicleStatus.mockResolvedValue({
      success: true,
    } satisfies DeleteCatalogEntryResult);

    const actionState = await deleteVehicleStatusAction(
      initialDeleteCatalogEntryActionState,
      createFormData("1"),
    );

    expect(executeDeleteVehicleStatus).toHaveBeenCalledWith(1);
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the id is missing", async () => {
    const actionState = await deleteVehicleStatusAction(
      initialDeleteCatalogEntryActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeDeleteVehicleStatus).not.toHaveBeenCalled();
  });

  it("reports in_use without revalidating when the entry is still referenced", async () => {
    executeDeleteVehicleStatus.mockResolvedValue({
      success: false,
      error: { type: "IN_USE" },
    } satisfies DeleteCatalogEntryResult);

    const actionState = await deleteVehicleStatusAction(
      initialDeleteCatalogEntryActionState,
      createFormData("1"),
    );

    expect(actionState).toEqual({ status: "in_use" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates but reports not_found when the entry was already removed", async () => {
    executeDeleteVehicleStatus.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies DeleteCatalogEntryResult);

    const actionState = await deleteVehicleStatusAction(
      initialDeleteCatalogEntryActionState,
      createFormData("1"),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
  });
});
