import type {
  CreatePersonInput,
  CreatePersonValidationErrorCode,
} from "../../../application/create-person/create-person.contract";

export type CreatePersonActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | {
      status: "validation_error";
      fieldErrors: Partial<
        Record<keyof CreatePersonInput, CreatePersonValidationErrorCode[]>
      >;
    }
  | { status: "national_code_already_exists" }
  | { status: "personnel_no_already_exists" }
  | { status: "card_no_already_exists" };

export const initialCreatePersonActionState: CreatePersonActionState = {
  status: "idle",
};
