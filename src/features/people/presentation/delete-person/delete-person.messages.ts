import type { DeletePersonActionState } from "./delete-person.action-state";

export function getDeletePersonStatusMessage(
  actionState: DeletePersonActionState,
): { type: "error"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "درخواست حذف قابل پردازش نیست. لطفاً دوباره تلاش کنید.",
      };
    case "referenced":
      return {
        type: "error",
        text: "این شخص به پروندهٔ رانندگی متصل است و امکان حذف آن وجود ندارد. در صورت نیاز شخص را غیرفعال کنید.",
      };
    default:
      return null;
  }
}
