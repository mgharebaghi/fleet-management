import type {
  UpdatePersonInput,
  UpdatePersonValidationErrorCode,
} from "../../../application/update-person/update-person.contract";

export type UpdatePersonActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | {
      status: "validation_error";
      fieldErrors: Partial<
        Record<keyof UpdatePersonInput, UpdatePersonValidationErrorCode[]>
      >;
    }
  | { status: "national_code_already_exists" }
  | { status: "personnel_no_already_exists" }
  | { status: "card_no_already_exists" }
  | { status: "not_found" };

export const initialUpdatePersonActionState: UpdatePersonActionState = {
  status: "idle",
};
