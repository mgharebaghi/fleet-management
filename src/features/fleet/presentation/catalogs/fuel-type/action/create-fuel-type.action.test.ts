import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import type { CreateCatalogEntryResult } from "../../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";
import type { FuelType } from "../../../../application/catalogs/fuel-type";
import { initialCreateCatalogEntryActionState } from "../../create-catalog-entry/create-catalog-entry.action-state";
import { createFuelTypeAction } from "./create-fuel-type.action";

const { executeCreateFuelType, makeCreateFuelType, revalidatePath } =
  vi.hoisted(() => ({
    executeCreateFuelType: vi.fn(),
    makeCreateFuelType: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/fuel-type.factory", () => ({
  makeCreateFuelType,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const createdFuelType: FuelType = {
  id: 1,
  name: "بنزین",
  isActive: true,
};

function createFormData(name: string): FormData {
  const formData = new FormData();
  formData.set("name", name);
  return formData;
}

describe("createFuelTypeAction", () => {
  beforeEach(() => {
    executeCreateFuelType.mockReset();
    makeCreateFuelType.mockReset();
    makeCreateFuelType.mockReturnValue({ execute: executeCreateFuelType });
    revalidatePath.mockClear();
  });

  it("revalidates the catalogs page and resets to idle after a successful create", async () => {
    executeCreateFuelType.mockResolvedValue({
      success: true,
      entry: createdFuelType,
    } satisfies CreateCatalogEntryResult<FuelType>);

    const actionState = await createFuelTypeAction(
      initialCreateCatalogEntryActionState,
      createFormData("بنزین"),
    );

    expect(executeCreateFuelType).toHaveBeenCalledWith({ name: "بنزین" });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(actionState).toEqual({ status: "idle" });
  });

  it("returns invalid_form without calling the use case when the name field is absent", async () => {
    const actionState = await createFuelTypeAction(
      initialCreateCatalogEntryActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeCreateFuelType).not.toHaveBeenCalled();
  });

  it("maps a validation error from the use case without revalidating", async () => {
    executeCreateFuelType.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { name: ["REQUIRED"] },
      },
    } satisfies CreateCatalogEntryResult<FuelType>);

    const actionState = await createFuelTypeAction(
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
    executeCreateFuelType.mockResolvedValue({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    } satisfies CreateCatalogEntryResult<FuelType>);

    const actionState = await createFuelTypeAction(
      initialCreateCatalogEntryActionState,
      createFormData("بنزین"),
    );

    expect(actionState).toEqual({ status: "name_already_exists" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
