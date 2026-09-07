import type { DeleteVehicleActionState } from "./delete-vehicle.action-state";

export function getDeleteVehicleStatusMessage(
  actionState: DeleteVehicleActionState,
): { type: "error"; text: string } | null {
  switch (actionState.status) {
    case "invalid_form":
      return {
        type: "error",
        text: "درخواست حذف قابل پردازش نیست. لطفاً دوباره تلاش کنید.",
      };
    case "in_use":
      return {
        type: "error",
        text: "این خودرو به تخصیص، بیمه یا سابقهٔ کارکرد متصل است و امکان حذف آن وجود ندارد.",
      };
    default:
      return null;
  }
}
