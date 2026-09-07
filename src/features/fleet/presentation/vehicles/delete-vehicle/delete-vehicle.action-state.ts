export type DeleteVehicleActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | { status: "in_use" }
  | { status: "not_found" };

export const initialDeleteVehicleActionState: DeleteVehicleActionState = {
  status: "idle",
};
