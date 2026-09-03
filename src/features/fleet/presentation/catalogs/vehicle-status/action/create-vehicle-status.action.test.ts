import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import type { CreateCatalogEntryResult } from "../../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";
import type { VehicleStatusEntry } from "../../../../application/catalogs/vehicle-status";
import { initialCreateCatalogEntryActionState } from "../../create-catalog-entry/create-catalog-entry.action-state";
import { createVehicleStatusAction } from "./create-vehicle-status.action";

const {
  executeCreateVehicleStatus,
  makeCreateVehicleStatus,
  revalidatePath,
} = vi.hoisted(() => ({
  executeCreateVehicleStatus: vi.fn(),
  makeCreateVehicleStatus: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("../../../../composition/catalogs/vehicle-status.factory", () => ({
  makeCreateVehicleStatus,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const createdVehicleStatus: VehicleStatusEntry = {
  id: 1,
  name: "در سرویس",
};

function createFormData(name: string): FormData {
  const formData = new FormData();
  formData.set("name", name);
  return formData;
}

describe("createVehicleStatusAction", () => {
  beforeEach(() => {
    executeCreateVehicleStatus.mockReset();
    makeCreateVehicleStatus.mockReset();
    makeCreateVehicleStatus.mockReturnValue({
      execute: executeCreateVehicleStatus,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful create", async () => {
    executeCreateVehicleStatus.mockResolvedValue({
      success: true,
      entry: createdVehicleStatus,
    } satisfies CreateCatalogEntryResult<VehicleStatusEntry>);

    const actionState = await createVehicleStatusAction(
      initialCreateCatalogEntryActionState,
      createFormData("در سرویس"),
    );

    expect(executeCreateVehicleStatus).toHaveBeenCalledWith({
      name: "در سرویس",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the name field is absent", async () => {
    const actionState = await createVehicleStatusAction(
      initialCreateCatalogEntryActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeCreateVehicleStatus).not.toHaveBeenCalled();
  });

  it("maps a validation error from the use case without revalidating", async () => {
    executeCreateVehicleStatus.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { name: ["REQUIRED"] },
      },
    } satisfies CreateCatalogEntryResult<VehicleStatusEntry>);

    const actionState = await createVehicleStatusAction(
      initialCreateCatalogEntryActionState,
      createFormData(" "),
    );

    expect(actionState).toEqual({
      status: "validation_error",
      fieldErrors: { name: ["REQUIRED"] },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a duplicate name error from the use case without revalidating", async () => {
    executeCreateVehicleStatus.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies CreateCatalogEntryResult<VehicleStatusEntry>);

    const actionState = await createVehicleStatusAction(
      initialCreateCatalogEntryActionState,
      createFormData("در سرویس"),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
