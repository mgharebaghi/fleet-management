import type {
  UpdatePersonInput,
  UpdatePersonValidationErrorCode,
} from "../../../application/update-person/update-person.contract";
import type { UpdatePersonActionState } from "../action/update-person.action-state";

const validationErrorMessages: Record<
  UpdatePersonValidationErrorCode,
  string
> = {
  REQUIRED: "وارد کردن این فیلد الزامی است.",
  EMPTY: "این فیلد نمی‌تواند خالی باشد.",
  TOO_LONG: "مقدار واردشده بیش از حد مجاز است.",
  INVALID_DATE: "تاریخ استخدام معتبر نیست.",
  INVALID_NATIONAL_CODE: "کد ملی واردشده معتبر نیست.",
};

export function getUpdatePersonFieldErrorMessages(
  actionState: UpdatePersonActionState,
  fieldName: keyof UpdatePersonInput,
): string[] {
  if (actionState.status === "validation_error") {
    return (actionState.fieldErrors[fieldName] ?? []).map(
      (errorCode) => validationErrorMessages[errorCode],
    );
  }

  if (
    actionState.status === "national_code_already_exists" &&
    fieldName === "nationalCode"
  ) {
    return ["این کد ملی قبلاً برای شخص دیگری ثبت شده است."];
  }

  if (
    actionState.status === "personnel_no_already_exists" &&
    fieldName === "personnelNo"
  ) {
    return ["این شماره پرسنلی قبلاً برای شخص دیگری ثبت شده است."];
  }

  if (
    actionState.status === "card_no_already_exists" &&
    fieldName === "cardNo"
  ) {
    return ["این شماره کارت قبلاً برای شخص دیگری ثبت شده است."];
  }

  return [];
}

export function getUpdatePersonStatusMessage(
  actionState: UpdatePersonActionState,
): { type: "error"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "داده‌های فرم قابل پردازش نیست. لطفاً مقادیر را بررسی و دوباره تلاش کنید.",
      };
    case "not_found":
      return {
        type: "error",
        text: "این شخص قبلاً حذف شده است.",
      };
    default:
      return null;
  }
}
