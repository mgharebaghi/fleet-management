import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import type { CreateCatalogEntryResult } from "../../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";
import type { VehicleType } from "../../../../application/catalogs/vehicle-type";
import { initialCreateCatalogEntryActionState } from "../../create-catalog-entry/create-catalog-entry.action-state";
import { createVehicleTypeAction } from "./create-vehicle-type.action";

const { executeCreateVehicleType, makeCreateVehicleType, revalidatePath } =
  vi.hoisted(() => ({
    executeCreateVehicleType: vi.fn(),
    makeCreateVehicleType: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-type.factory", () => ({
  makeCreateVehicleType,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const createdVehicleType: VehicleType = {
  id: 1,
  name: "کامیون",
  isActive: true,
};

function createFormData(name: string): FormData {
  const formData = new FormData();
  formData.set("name", name);
  return formData;
}

describe("createVehicleTypeAction", () => {
  beforeEach(() => {
    executeCreateVehicleType.mockReset();
    makeCreateVehicleType.mockReset();
    makeCreateVehicleType.mockReturnValue({
      execute: executeCreateVehicleType,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful create", async () => {
    executeCreateVehicleType.mockResolvedValue({
      success: true,
      entry: createdVehicleType,
    } satisfies CreateCatalogEntryResult<VehicleType>);

    const actionState = await createVehicleTypeAction(
      initialCreateCatalogEntryActionState,
      createFormData("کامیون"),
    );

    expect(executeCreateVehicleType).toHaveBeenCalledWith({ name: "کامیون" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the name field is absent", async () => {
    const actionState = await createVehicleTypeAction(
      initialCreateCatalogEntryActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeCreateVehicleType).not.toHaveBeenCalled();
  });

  it("maps a validation error from the use case without revalidating", async () => {
    executeCreateVehicleType.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { name: ["REQUIRED"] },
      },
    } satisfies CreateCatalogEntryResult<VehicleType>);

    const actionState = await createVehicleTypeAction(
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
    executeCreateVehicleType.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies CreateCatalogEntryResult<VehicleType>);

    const actionState = await createVehicleTypeAction(
      initialCreateCatalogEntryActionState,
      createFormData("کامیون"),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
