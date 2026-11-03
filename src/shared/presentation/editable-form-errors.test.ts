import { describe, expect, it } from "vitest";
import { dismissEditedFormErrors } from "./editable-form-errors";

describe("editable form feedback", () => {
  it("clears only the edited field and removes the summary after the final error", () => {
    const state = { error: { type: "VALIDATION_ERROR", fieldErrors: { name: "REQUIRED", code: "REQUIRED" } }, values: { name: "", code: "" } };
    expect(dismissEditedFormErrors(state, new Set(["name"]), {})).toEqual({ ...state, error: { type: "VALIDATION_ERROR", fieldErrors: { code: "REQUIRED" } } });
    expect(dismissEditedFormErrors(state, new Set(["name", "code"]), {})).toEqual({ values: state.values });
    expect(state.error.fieldErrors.name).toBe("REQUIRED");
  });
  it("supports root field errors and inventory error envelopes without discarding values", () => {
    expect(dismissEditedFormErrors({ status: "validation_error", fieldErrors: { name: ["REQUIRED"] } }, new Set(["name"]), {})).toEqual({ status: "idle" });
    expect(dismissEditedFormErrors({ status: "failed", error: { type: "VALIDATION_ERROR", fields: { name: "REQUIRED" } } }, new Set(["name"]), {})).toEqual({ status: "idle" });
  });
  it("requires feature-owned mappings for non-validation failures", () => {
    const state = { error: "DUPLICATE", values: { name: "Existing" } };
    expect(dismissEditedFormErrors(state, new Set(["code"]), { DUPLICATE: ["name"] })).toEqual(state);
    expect(dismissEditedFormErrors(state, new Set(["name"]), { DUPLICATE: ["name"] })).toEqual({ values: state.values });
    expect(dismissEditedFormErrors({ status: "name_already_exists" }, new Set(["name"]), { name_already_exists: ["name"] })).toEqual({ status: "idle" });
  });
  it("preserves service failures and successful results while dismissing an explicit field error", () => {
    expect(dismissEditedFormErrors({ error: "UNEXPECTED", formError: true }, new Set(["name"]), {})).toEqual({ error: "UNEXPECTED", formError: true });
    expect(dismissEditedFormErrors({ status: "saved" }, new Set(["name"]), {})).toEqual({ status: "saved" });
    expect(dismissEditedFormErrors({ error: "INVALID_DATE", field: "day", values: { day: "" } }, new Set(["day"]), {})).toEqual({ values: { day: "" } });
  });
});
