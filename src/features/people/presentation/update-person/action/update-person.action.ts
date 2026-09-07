"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { makeUpdatePerson } from "../../../composition/person.factory";
import type { UpdatePersonActionState } from "./update-person.action-state";
import { parseUpdatePersonFormData } from "./update-person.form-data";

export async function updatePersonAction(
  previousState: UpdatePersonActionState,
  formData: FormData,
): Promise<UpdatePersonActionState> {
  void previousState;

  const parsedFormData = parseUpdatePersonFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const updatePersonResult = await makeUpdatePerson().execute(
    parsedFormData.input,
  );

  if (updatePersonResult.success) {
    revalidatePath("/people");
    revalidatePath(`/people/${parsedFormData.input.personId}`);
    redirect(`/people/${parsedFormData.input.personId}`);
  }

  switch (updatePersonResult.error.type) {
    case "VALIDATION_ERROR":
      return {
        status: "validation_error",
        fieldErrors: updatePersonResult.error.fieldErrors,
      };
    case "NATIONAL_CODE_ALREADY_EXISTS":
      return { status: "national_code_already_exists" };
    case "PERSONNEL_NO_ALREADY_EXISTS":
      return { status: "personnel_no_already_exists" };
    case "CARD_NO_ALREADY_EXISTS":
      return { status: "card_no_already_exists" };
    case "NOT_FOUND":
      return { status: "not_found" };
    default: {
      const unhandledError: never = updatePersonResult.error;
      throw new Error(
        `Unhandled UpdatePerson error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
