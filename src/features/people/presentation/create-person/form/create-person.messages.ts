import type {
  CreatePersonInput,
  CreatePersonValidationErrorCode,
} from "../../../application/create-person/create-person.contract";
import type { CreatePersonActionState } from "../action/create-person.action-state";

const validationErrorMessages: Record<
  CreatePersonValidationErrorCode,
  string
> = {
  REQUIRED: "وارد کردن این فیلد الزامی است.",
  EMPTY: "این فیلد نمی‌تواند خالی باشد.",
  TOO_LONG: "مقدار واردشده بیش از حد مجاز است.",
  INVALID_DATE: "تاریخ استخدام معتبر نیست.",
  INVALID_NATIONAL_CODE: "کد ملی واردشده معتبر نیست.",
};

export function getCreatePersonFieldErrorMessages(
  actionState: CreatePersonActionState,
  fieldName: keyof CreatePersonInput,
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
    return ["این کد ملی قبلاً ثبت شده است."];
  }

  if (
    actionState.status === "personnel_no_already_exists" &&
    fieldName === "personnelNo"
  ) {
    return ["این شماره پرسنلی قبلاً ثبت شده است."];
  }

  if (
    actionState.status === "card_no_already_exists" &&
    fieldName === "cardNo"
  ) {
    return ["این شماره کارت قبلاً ثبت شده است."];
  }

  return [];
}

export function getCreatePersonStatusMessage(
  actionState: CreatePersonActionState,
): { type: "error" | "success"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "داده‌های فرم قابل پردازش نیست. لطفاً مقادیر را بررسی و دوباره تلاش کنید.",
      };
    case "success":
      return {
        type: "success",
        text: "اطلاعات شخص با موفقیت ثبت شد.",
      };
    default:
      return null;
  }
}
