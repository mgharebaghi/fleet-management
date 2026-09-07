export type DeletePersonError = { type: "NOT_FOUND" } | { type: "REFERENCED" };

export type DeletePersonResult =
  | { success: true }
  | { success: false; error: DeletePersonError };
