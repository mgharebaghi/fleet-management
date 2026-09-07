import type { DeleteVehicleInsuranceActionState } from "./delete-vehicle-insurance.action-state";

export function getDeleteVehicleInsuranceStatusMessage(
  actionState: DeleteVehicleInsuranceActionState,
): { type: "error"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "درخواست حذف قابل پردازش نیست. لطفاً دوباره تلاش کنید.",
      };
    case "not_found":
      return { type: "error", text: "این بیمه‌نامه قبلاً حذف شده است." };
    default:
      return null;
  }
}
