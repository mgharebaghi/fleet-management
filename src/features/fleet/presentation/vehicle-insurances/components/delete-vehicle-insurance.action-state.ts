export type DeleteVehicleInsuranceActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | { status: "not_found" };

export const initialDeleteVehicleInsuranceActionState: DeleteVehicleInsuranceActionState =
  { status: "idle" };
