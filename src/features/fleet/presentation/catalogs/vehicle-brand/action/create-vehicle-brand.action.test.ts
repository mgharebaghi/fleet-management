import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import type { CreateCatalogEntryResult } from "../../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";
import type { VehicleBrand } from "../../../../application/catalogs/vehicle-brand";
import { initialCreateCatalogEntryActionState } from "../../create-catalog-entry/create-catalog-entry.action-state";
import { createVehicleBrandAction } from "./create-vehicle-brand.action";

const { executeCreateVehicleBrand, makeCreateVehicleBrand, revalidatePath } =
  vi.hoisted(() => ({
    executeCreateVehicleBrand: vi.fn(),
    makeCreateVehicleBrand: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-brand.factory", () => ({
  makeCreateVehicleBrand,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const createdVehicleBrand: VehicleBrand = {
  id: 1,
  name: "Volvo",
  isActive: true,
};

function createFormData(name: string): FormData {
  const formData = new FormData();
  formData.set("name", name);
  return formData;
}

describe("createVehicleBrandAction", () => {
  beforeEach(() => {
    executeCreateVehicleBrand.mockReset();
    makeCreateVehicleBrand.mockReset();
    makeCreateVehicleBrand.mockReturnValue({
      execute: executeCreateVehicleBrand,
    });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful create", async () => {
    executeCreateVehicleBrand.mockResolvedValue({
      success: true,
      entry: createdVehicleBrand,
    } satisfies CreateCatalogEntryResult<VehicleBrand>);

    const actionState = await createVehicleBrandAction(
      initialCreateCatalogEntryActionState,
      createFormData("Volvo"),
    );

    expect(executeCreateVehicleBrand).toHaveBeenCalledWith({ name: "Volvo" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the name field is absent", async () => {
    const actionState = await createVehicleBrandAction(
      initialCreateCatalogEntryActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeCreateVehicleBrand).not.toHaveBeenCalled();
  });

  it("maps a validation error from the use case without revalidating", async () => {
    executeCreateVehicleBrand.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { name: ["REQUIRED"] },
      },
    } satisfies CreateCatalogEntryResult<VehicleBrand>);

    const actionState = await createVehicleBrandAction(
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
    executeCreateVehicleBrand.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies CreateCatalogEntryResult<VehicleBrand>);

    const actionState = await createVehicleBrandAction(
      initialCreateCatalogEntryActionState,
      createFormData("Volvo"),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
