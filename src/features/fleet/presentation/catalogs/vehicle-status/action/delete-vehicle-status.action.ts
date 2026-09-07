"use server";

import { revalidatePath } from "next/cache";

import { makeDeleteVehicleStatus } from "../../../../composition/catalogs/vehicle-status.factory";
import type { DeleteCatalogEntryActionState } from "../../delete-catalog-entry/delete-catalog-entry.action-state";
import { parseDeleteCatalogEntryFormData } from "../../delete-catalog-entry/delete-catalog-entry.form-data";

export async function deleteVehicleStatusAction(
  previousState: DeleteCatalogEntryActionState,
  formData: FormData,
): Promise<DeleteCatalogEntryActionState> {
  void previousState;

  const parsedFormData = parseDeleteCatalogEntryFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeDeleteVehicleStatus().execute(parsedFormData.id);

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
        `Unhandled DeleteCatalogEntry error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
