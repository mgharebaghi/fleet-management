import type { NewPerson, Person } from "../person";

export type CreatePersonInput = NewPerson;

export type CreatePersonValidationErrorCode =
  | "REQUIRED"
  | "EMPTY"
  | "TOO_LONG"
  | "INVALID_DATE"
  | "INVALID_NATIONAL_CODE";

export type CreatePersonValidationError = {
  type: "VALIDATION_ERROR";
  fieldErrors: Partial<
    Record<keyof CreatePersonInput, CreatePersonValidationErrorCode[]>
  >;
};

export type CreatePersonError =
  | CreatePersonValidationError
  | { type: "NATIONAL_CODE_ALREADY_EXISTS" }
  | { type: "PERSONNEL_NO_ALREADY_EXISTS" }
  | { type: "CARD_NO_ALREADY_EXISTS" };

export type CreatePersonResult =
  | { success: true; person: Person }
  | { success: false; error: CreatePersonError };
