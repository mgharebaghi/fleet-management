import { describe, expect, it } from "vitest";

import {
  getCreateCatalogEntryFieldErrorMessages,
  getCreateCatalogEntryStatusMessage,
} from "./create-catalog-entry.messages";

describe("getCreateCatalogEntryFieldErrorMessages", () => {
  it("returns Persian messages for validation error codes", () => {
    const messages = getCreateCatalogEntryFieldErrorMessages({
      status: "validation_error",
      fieldErrors: { name: ["REQUIRED"] },
    });

    expect(messages).toEqual(["وارد کردن این فیلد الزامی است."]);
  });

  it("returns an empty array for non-validation statuses", () => {
    expect(
      getCreateCatalogEntryFieldErrorMessages({ status: "idle" }),
    ).toEqual([]);
  });
});

describe("getCreateCatalogEntryStatusMessage", () => {
  it("returns the duplicate message for name_already_exists", () => {
    expect(
      getCreateCatalogEntryStatusMessage(
        { status: "name_already_exists" },
        "این نام برند قبلاً ثبت شده است.",
      ),
    ).toEqual({ type: "error", text: "این نام برند قبلاً ثبت شده است." });
  });

  it("returns an invalid form message for invalid_form", () => {
    const message = getCreateCatalogEntryStatusMessage(
      { status: "invalid_form" },
      "این نام برند قبلاً ثبت شده است.",
    );

    expect(message?.type).toBe("error");
  });

  it("returns null for idle and validation_error", () => {
    expect(
      getCreateCatalogEntryStatusMessage({ status: "idle" }, "duplicate"),
    ).toBeNull();
    expect(
      getCreateCatalogEntryStatusMessage(
        { status: "validation_error", fieldErrors: { name: ["REQUIRED"] } },
        "duplicate",
      ),
    ).toBeNull();
  });
});
