export type DeletePersonActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | { status: "referenced" }
  | { status: "not_found" };

export const initialDeletePersonActionState: DeletePersonActionState = {
  status: "idle",
};
