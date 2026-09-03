"use server";

import { revalidatePath } from "next/cache";

import { makeCreateFuelType } from "../../../../composition/catalogs/fuel-type.factory";
import type { CreateCatalogEntryActionState } from "../../create-catalog-entry/create-catalog-entry.action-state";
import { parseCreateCatalogEntryFormData } from "../../create-catalog-entry/create-catalog-entry.form-data";

export async function createFuelTypeAction(
  previousState: CreateCatalogEntryActionState,
  formData: FormData,
): Promise<CreateCatalogEntryActionState> {
  void previousState;

  const parsedFormData = parseCreateCatalogEntryFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeCreateFuelType().execute(parsedFormData.input);

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
    default: {
      const unhandledError: never = result.error;
      throw new Error(
        `Unhandled CreateCatalogEntry error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
