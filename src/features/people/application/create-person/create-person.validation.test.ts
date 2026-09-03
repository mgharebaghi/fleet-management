import { describe, expect, it } from "vitest";

import {
  normalizeCreatePersonInput,
  validateCreatePersonInput,
} from "./create-person.validation";
import type { CreatePersonInput } from "./create-person.contract";

const validCreatePersonInput: CreatePersonInput = {
  personnelNo: "P-100",
  firstName: "Ali",
  lastName: "Ahmadi",
  nationalCode: "0012345679",
  cardNo: "C-100",
  mobile: "09120000000",
  employmentDate: new Date("2026-01-10T00:00:00.000Z"),
};

describe("normalizeCreatePersonInput", () => {
  it("trims all provided string values without changing other values", () => {
    const employmentDate = new Date("2026-01-10T00:00:00.000Z");
    const inputWithWhitespace: CreatePersonInput = {
      personnelNo: " P-100 ",
      firstName: " Ali ",
      lastName: " Ahmadi ",
      nationalCode: " 0012345679 ",
      cardNo: " C-100 ",
      mobile: " 09120000000 ",
      employmentDate,
    };

    expect(normalizeCreatePersonInput(inputWithWhitespace)).toEqual({
      personnelNo: "P-100",
      firstName: "Ali",
      lastName: "Ahmadi",
      nationalCode: "0012345679",
      cardNo: "C-100",
      mobile: "09120000000",
      employmentDate,
    });
  });

  it("preserves null optional values", () => {
    const inputWithNullValues: CreatePersonInput = {
      ...validCreatePersonInput,
      personnelNo: null,
      nationalCode: null,
      cardNo: null,
      mobile: null,
    };

    expect(normalizeCreatePersonInput(inputWithNullValues)).toEqual(
      inputWithNullValues,
    );
  });
});

describe("validateCreatePersonInput", () => {
  it("returns null for valid input", () => {
    expect(validateCreatePersonInput(validCreatePersonInput)).toBeNull();
  });

  it("accepts null optional values", () => {
    const inputWithNullOptionalValues: CreatePersonInput = {
      ...validCreatePersonInput,
      personnelNo: null,
      nationalCode: null,
      cardNo: null,
      mobile: null,
      employmentDate: null,
    };

    expect(validateCreatePersonInput(inputWithNullOptionalValues)).toBeNull();
  });

  it("returns required errors for blank required names", () => {
    const inputWithBlankNames: CreatePersonInput = {
      ...validCreatePersonInput,
      firstName: "",
      lastName: "   ",
    };

    expect(validateCreatePersonInput(inputWithBlankNames)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: {
        firstName: ["REQUIRED"],
        lastName: ["REQUIRED"],
      },
    });
  });

  it("returns empty errors for blank optional strings", () => {
    const inputWithBlankOptionalStrings: CreatePersonInput = {
      ...validCreatePersonInput,
      personnelNo: "",
      nationalCode: " ",
      cardNo: "  ",
      mobile: "   ",
    };

    expect(validateCreatePersonInput(inputWithBlankOptionalStrings)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: {
        personnelNo: ["EMPTY"],
        nationalCode: ["EMPTY"],
        cardNo: ["EMPTY"],
        mobile: ["EMPTY"],
      },
    });
  });

  it("returns too long errors for strings beyond database limits", () => {
    const inputWithLongStrings: CreatePersonInput = {
      ...validCreatePersonInput,
      firstName: "a".repeat(101),
      lastName: "a".repeat(101),
      personnelNo: "a".repeat(51),
      nationalCode: "a".repeat(21),
      cardNo: "a".repeat(9),
      mobile: "a".repeat(21),
    };

    expect(validateCreatePersonInput(inputWithLongStrings)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: {
        firstName: ["TOO_LONG"],
        lastName: ["TOO_LONG"],
        personnelNo: ["TOO_LONG"],
        nationalCode: ["TOO_LONG"],
        cardNo: ["TOO_LONG"],
        mobile: ["TOO_LONG"],
      },
    });
  });

  it("accepts strings at database length limits", () => {
    const inputAtLengthLimits: CreatePersonInput = {
      ...validCreatePersonInput,
      firstName: "a".repeat(100),
      lastName: "a".repeat(100),
      personnelNo: "a".repeat(50),
      cardNo: "a".repeat(8),
      mobile: "a".repeat(20),
    };

    expect(validateCreatePersonInput(inputAtLengthLimits)).toBeNull();
  });

  it.each([
    "0012345678",
    "001234567",
    "001234567a",
    "1111111111",
  ])("returns an invalid national code error for %s", (nationalCode) => {
    const inputWithInvalidNationalCode: CreatePersonInput = {
      ...validCreatePersonInput,
      nationalCode,
    };

    expect(validateCreatePersonInput(inputWithInvalidNationalCode)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: { nationalCode: ["INVALID_NATIONAL_CODE"] },
    });
  });

  it("returns an invalid date error for an invalid employment date", () => {
    const inputWithInvalidDate: CreatePersonInput = {
      ...validCreatePersonInput,
      employmentDate: new Date("invalid"),
    };

    expect(validateCreatePersonInput(inputWithInvalidDate)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: { employmentDate: ["INVALID_DATE"] },
    });
  });
});
