import type { CreateCatalogEntryValidationErrorCode } from "../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";
import type { CreateCatalogEntryActionState } from "./create-catalog-entry.action-state";

const validationErrorMessages: Record<
  CreateCatalogEntryValidationErrorCode,
  string
> = {
  REQUIRED: "وارد کردن این فیلد الزامی است.",
  TOO_LONG: "مقدار واردشده بیش از حد مجاز است.",
};

export function getCreateCatalogEntryFieldErrorMessages(
  actionState: CreateCatalogEntryActionState,
): string[] {
  if (actionState.status !== "validation_error") {
    return [];
  }

  return actionState.fieldErrors.name.map(
    (errorCode) => validationErrorMessages[errorCode],
  );
}

export function getCreateCatalogEntryStatusMessage(
  actionState: CreateCatalogEntryActionState,
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
    default:
      return null;
  }
}
