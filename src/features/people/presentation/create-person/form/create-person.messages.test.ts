import { describe, expect, it } from "vitest";

import type { CreatePersonValidationErrorCode } from "../../../application/person/create-person/create-person.contract";
import {
  getCreatePersonFieldErrorMessages,
  getCreatePersonStatusMessage,
} from "./create-person.messages";

describe("Create Person presentation messages", () => {
  it.each([
    ["REQUIRED", "وارد کردن این فیلد الزامی است."],
    ["EMPTY", "این فیلد نمی‌تواند خالی باشد."],
    ["TOO_LONG", "مقدار واردشده بیش از حد مجاز است."],
    ["INVALID_DATE", "تاریخ استخدام معتبر نیست."],
    ["INVALID_NATIONAL_CODE", "کد ملی واردشده معتبر نیست."],
  ] satisfies ReadonlyArray<[CreatePersonValidationErrorCode, string]>)(
    "maps %s to its Persian field message",
    (errorCode, expectedMessage) => {
      expect(
        getCreatePersonFieldErrorMessages(
          {
            status: "validation_error",
            fieldErrors: { employmentDate: [errorCode] },
          },
          "employmentDate",
        ),
      ).toEqual([expectedMessage]);
    },
  );

  it.each([
    [
      "national_code_already_exists",
      "nationalCode",
      "این کد ملی قبلاً ثبت شده است.",
    ],
    [
      "personnel_no_already_exists",
      "personnelNo",
      "این شماره پرسنلی قبلاً ثبت شده است.",
    ],
    [
      "card_no_already_exists",
      "cardNo",
      "این شماره کارت قبلاً ثبت شده است.",
    ],
  ] as const)(
    "places %s beside %s",
    (status, fieldName, expectedMessage) => {
      expect(
        getCreatePersonFieldErrorMessages({ status }, fieldName),
      ).toEqual([expectedMessage]);
    },
  );

  it("maps form failure and success to Persian status messages", () => {
    expect(getCreatePersonStatusMessage({ status: "invalid_form" })).toEqual({
      type: "error",
      text: "داده‌های فرم قابل پردازش نیست. لطفاً مقادیر را بررسی و دوباره تلاش کنید.",
    });
    expect(
      getCreatePersonStatusMessage({ status: "success", personId: 1 }),
    ).toEqual({
      type: "success",
      text: "اطلاعات شخص با موفقیت ثبت شد.",
    });
  });
});
