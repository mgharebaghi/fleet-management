import type { NewPerson, Person } from "../person";

export type UpdatePersonInput = NewPerson & {
  personId: number;
  isActive: boolean;
};

export type UpdatePersonValidationErrorCode =
  | "REQUIRED"
  | "EMPTY"
  | "TOO_LONG"
  | "INVALID_DATE"
  | "INVALID_NATIONAL_CODE";

export type UpdatePersonValidationError = {
  type: "VALIDATION_ERROR";
  fieldErrors: Partial<
    Record<keyof NewPerson, UpdatePersonValidationErrorCode[]>
  >;
};

export type UpdatePersonError =
  | UpdatePersonValidationError
  | { type: "NATIONAL_CODE_ALREADY_EXISTS" }
  | { type: "PERSONNEL_NO_ALREADY_EXISTS" }
  | { type: "CARD_NO_ALREADY_EXISTS" }
  | { type: "NOT_FOUND" };

export type UpdatePersonResult =
  | { success: true; person: Person }
  | { success: false; error: UpdatePersonError };
