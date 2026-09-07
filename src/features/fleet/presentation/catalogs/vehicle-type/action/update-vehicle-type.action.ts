"use server";

import { revalidatePath } from "next/cache";

import { makeUpdateVehicleType } from "../../../../composition/catalogs/vehicle-type.factory";
import type { UpdateCatalogEntryActionState } from "../../update-catalog-entry/update-catalog-entry.action-state";
import { parseUpdateCatalogEntryFormData } from "../../update-catalog-entry/update-catalog-entry.form-data";

export async function updateVehicleTypeAction(
  previousState: UpdateCatalogEntryActionState,
  formData: FormData,
): Promise<UpdateCatalogEntryActionState> {
  void previousState;

  const parsedFormData = parseUpdateCatalogEntryFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeUpdateVehicleType().execute(parsedFormData.input);

  if (result.success) {
    revalidatePath("/fleet/catalogs");
    return { status: "idle" };
  }

  switch (result.error.type) {
    case "VALIDATION_ERROR":
      return {
        status: "validation_error",
        fieldErrors: result.error.fieldErrors,
      };
    case "NAME_ALREADY_EXISTS":
      return { status: "name_already_exists" };
    case "NOT_FOUND":
      revalidatePath("/fleet/catalogs");
      return { status: "not_found" };
    default: {
      const unhandledError: never = result.error;
      throw new Error(
        `Unhandled UpdateCatalogEntry error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
