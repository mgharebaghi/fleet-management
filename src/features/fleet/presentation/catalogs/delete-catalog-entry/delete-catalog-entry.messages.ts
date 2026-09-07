import type { DeleteCatalogEntryActionState } from "./delete-catalog-entry.action-state";

export function getDeleteCatalogEntryStatusMessage(
  actionState: DeleteCatalogEntryActionState,
  inUseMessage: string,
): { type: "error"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "درخواست حذف قابل پردازش نیست. لطفاً دوباره تلاش کنید.",
      };
    case "not_found":
      return {
        type: "error",
        text: "این مورد قبلاً حذف شده است.",
      };
    case "in_use":
      return { type: "error", text: inUseMessage };
    default:
      return null;
  }
}
