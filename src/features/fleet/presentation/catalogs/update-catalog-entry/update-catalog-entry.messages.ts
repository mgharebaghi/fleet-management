import type { UpdateCatalogEntryValidationErrorCode } from "../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";
import type { UpdateCatalogEntryActionState } from "./update-catalog-entry.action-state";

const validationErrorMessages: Record<
  UpdateCatalogEntryValidationErrorCode,
  string
> = {
  REQUIRED: "وارد کردن این فیلد الزامی است.",
  TOO_LONG: "مقدار واردشده بیش از حد مجاز است.",
};

export function getUpdateCatalogEntryFieldErrorMessages(
  actionState: UpdateCatalogEntryActionState,
): string[] {
  if (actionState.status !== "validation_error") {
    return [];
  }

  return actionState.fieldErrors.name.map(
    (errorCode) => validationErrorMessages[errorCode],
  );
}

export function getUpdateCatalogEntryStatusMessage(
  actionState: UpdateCatalogEntryActionState,
  duplicateMessage: string,
): { type: "error"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "داده‌های فرم قابل پردازش نیست. لطفاً دوباره تلاش کنید.",
      };
    case "name_already_exists":
      return { type: "error", text: duplicateMessage };
    case "not_found":
      return {
        type: "error",
        text: "این مورد قبلاً حذف یا تغییر کرده است. فهرست را دوباره بارگذاری کنید.",
      };
    default:
      return null;
  }
}
