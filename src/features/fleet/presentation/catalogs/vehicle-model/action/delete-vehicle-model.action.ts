"use server";

import { revalidatePath } from "next/cache";

import { makeDeleteVehicleModel } from "../../../../composition/catalogs/vehicle-model.factory";
import type { DeleteCatalogEntryActionState } from "../../delete-catalog-entry/delete-catalog-entry.action-state";
import { parseDeleteCatalogEntryFormData } from "../../delete-catalog-entry/delete-catalog-entry.form-data";

export async function deleteVehicleModelAction(
  previousState: DeleteCatalogEntryActionState,
  formData: FormData,
): Promise<DeleteCatalogEntryActionState> {
  void previousState;

  const parsedFormData = parseDeleteCatalogEntryFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeDeleteVehicleModel().execute(parsedFormData.id);

  if (result.success) {
    revalidatePath("/fleet/catalogs");
    return { status: "idle" };
  }

  switch (result.error.type) {
    case "IN_USE":
      return { status: "in_use" };
    case "NOT_FOUND":
      revalidatePath("/fleet/catalogs");
      return { status: "not_found" };
    default: {
      const unhandledError: never = result.error;
      throw new Error(
        `Unhandled DeleteVehicleModel error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
