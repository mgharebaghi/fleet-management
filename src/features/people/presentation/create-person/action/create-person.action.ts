"use server";

import { makeCreatePerson } from "../../../composition/create-person.factory";
import type { CreatePersonActionState } from "./create-person.action-state";
import { parseCreatePersonFormData } from "./create-person.form-data";

export async function createPersonAction(
  previousState: CreatePersonActionState,
  formData: FormData,
): Promise<CreatePersonActionState> {
  void previousState;

  const parsedFormData = parseCreatePersonFormData(formData);
  if (!parsedFormData.success) {
    return { status: "invalid_form" };
  }

  const createPersonResult = await makeCreatePerson().execute(
    parsedFormData.input,
  );

  if (createPersonResult.success) {
    return {
      status: "success",
      personId: createPersonResult.person.personId,
    };
  }

  switch (createPersonResult.error.type) {
    case "VALIDATION_ERROR":
      return {
        status: "validation_error",
        fieldErrors: createPersonResult.error.fieldErrors,
      };
    case "NATIONAL_CODE_ALREADY_EXISTS":
      return { status: "national_code_already_exists" };
    case "PERSONNEL_NO_ALREADY_EXISTS":
      return { status: "personnel_no_already_exists" };
    case "CARD_NO_ALREADY_EXISTS":
      return { status: "card_no_already_exists" };
    default: {
      const unhandledError: never = createPersonResult.error;
      throw new Error(
        `Unhandled CreatePerson error: ${JSON.stringify(unhandledError)}`,
      );
    }
  }
}
