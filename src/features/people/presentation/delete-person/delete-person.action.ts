"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeDeletePerson } from "../../composition/person.factory";
import type { DeletePersonActionState } from "./delete-person.action-state";
import { parseDeletePersonFormData } from "./delete-person.form-data";

export async function deletePersonAction(
  previousState: DeletePersonActionState,
  formData: FormData,
): Promise<DeletePersonActionState> {
  void previousState;

  const parsedFormData = parseDeletePersonFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const result = await makeDeletePerson().execute(parsedFormData.personId);

  if (result.success) {
    revalidatePath("/people");
    redirect("/people");
  }

  // Already gone: treat it the same as a successful delete instead of
  // showing the user a confusing error about a record they can no longer see.
  if (result.error.type === "NOT_FOUND") {
    revalidatePath("/people");
    redirect("/people");
  }

  switch (result.error.type) {
    case "REFERENCED":
      return { status: "referenced" };
    default: {
      const unhandledError: never = result.error;
      throw new Error(
        `Unhandled DeletePerson error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
