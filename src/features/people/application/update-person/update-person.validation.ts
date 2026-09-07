import { isValidIranianNationalCode } from "../national-code";
import type {
  UpdatePersonInput,
  UpdatePersonValidationError,
  UpdatePersonValidationErrorCode,
} from "./update-person.contract";

export function normalizeUpdatePersonInput(
  input: UpdatePersonInput,
): UpdatePersonInput {
  return {
    ...input,
    personnelNo: input.personnelNo?.trim() ?? null,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    nationalCode: input.nationalCode?.trim() ?? null,
    cardNo: input.cardNo?.trim() ?? null,
    mobile: input.mobile?.trim() ?? null,
  };
}

function validateRequiredString(
  value: string,
  maximumLength: number,
): UpdatePersonValidationErrorCode | undefined {
  if (value.trim().length === 0) {
    return "REQUIRED";
  }

  if (value.length > maximumLength) {
    return "TOO_LONG";
  }
}

function validateOptionalString(
  value: string | null,
  maximumLength: number,
): UpdatePersonValidationErrorCode | undefined {
  if (value === null) {
    return undefined;
  }

  if (value.trim().length === 0) {
    return "EMPTY";
  }

  if (value.length > maximumLength) {
    return "TOO_LONG";
  }
}

export function validateUpdatePersonInput(
  input: UpdatePersonInput,
): UpdatePersonValidationError | null {
  const fieldErrors: UpdatePersonValidationError["fieldErrors"] = {};

  const firstNameError = validateRequiredString(input.firstName, 100);
  if (firstNameError !== undefined) {
    fieldErrors.firstName = [firstNameError];
  }

  const lastNameError = validateRequiredString(input.lastName, 100);
  if (lastNameError !== undefined) {
    fieldErrors.lastName = [lastNameError];
  }

  const personnelNoError = validateOptionalString(input.personnelNo, 50);
  if (personnelNoError !== undefined) {
    fieldErrors.personnelNo = [personnelNoError];
  }

  const nationalCodeError = validateOptionalString(input.nationalCode, 20);
  if (nationalCodeError !== undefined) {
    fieldErrors.nationalCode = [nationalCodeError];
  } else if (
    input.nationalCode !== null &&
    !isValidIranianNationalCode(input.nationalCode)
  ) {
    fieldErrors.nationalCode = ["INVALID_NATIONAL_CODE"];
  }

  const cardNoError = validateOptionalString(input.cardNo, 8);
  if (cardNoError !== undefined) {
    fieldErrors.cardNo = [cardNoError];
  }

  const mobileError = validateOptionalString(input.mobile, 20);
  if (mobileError !== undefined) {
    fieldErrors.mobile = [mobileError];
  }

  if (
    input.employmentDate !== null &&
    (!(input.employmentDate instanceof Date) ||
      Number.isNaN(input.employmentDate.getTime()))
  ) {
    fieldErrors.employmentDate = ["INVALID_DATE"];
  }

  if (Object.keys(fieldErrors).length === 0) {
    return null;
  }

  return { type: "VALIDATION_ERROR", fieldErrors };
}
