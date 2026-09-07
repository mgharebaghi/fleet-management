import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdatePersonResult } from "../../../application/update-person/update-person.contract";
import type { Person } from "../../../application/person";
import { updatePersonAction } from "./update-person.action";
import { initialUpdatePersonActionState } from "./update-person.action-state";

const { executeUpdatePerson, makeUpdatePerson, redirect, revalidatePath } =
  vi.hoisted(() => ({
    executeUpdatePerson: vi.fn(),
    makeUpdatePerson: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../composition/person.factory", () => ({
  makeUpdatePerson,
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

const updatedPerson: Person = {
  personId: 1,
  personnelNo: "P-100",
  firstName: "Ali",
  lastName: "Ahmadi Renamed",
  nationalCode: "0012345679",
  cardNo: "C-100",
  mobile: "09120000000",
  employmentDate: new Date("2026-01-10T00:00:00.000Z"),
  isActive: false,
  createdAt: new Date("2026-01-11T08:00:00.000Z"),
};

function createValidFormData(): FormData {
  const formData = new FormData();
  formData.set("personId", "1");
  formData.set("personnelNo", "P-100");
  formData.set("firstName", "Ali");
  formData.set("lastName", "Ahmadi Renamed");
  formData.set("nationalCode", "0012345679");
  formData.set("cardNo", "C-100");
  formData.set("mobile", "09120000000");
  formData.set("employmentDate", "2026-01-10");
  return formData;
}

describe("updatePersonAction", () => {
  beforeEach(() => {
    executeUpdatePerson.mockReset();
    makeUpdatePerson.mockReset();
    makeUpdatePerson.mockReturnValue({ execute: executeUpdatePerson });
    redirect.mockClear();
    revalidatePath.mockClear();
  });

  it("revalidates and redirects to the person's detail page after a successful update", async () => {
    executeUpdatePerson.mockResolvedValue({
      success: true,
      person: updatedPerson,
    } satisfies UpdatePersonResult);

    await expect(
      updatePersonAction(initialUpdatePersonActionState, createValidFormData()),
    ).rejects.toThrow("NEXT_REDIRECT:/people/1");

    expect(executeUpdatePerson).toHaveBeenCalledWith({
      personId: 1,
      personnelNo: "P-100",
      firstName: "Ali",
      lastName: "Ahmadi Renamed",
      nationalCode: "0012345679",
      cardNo: "C-100",
      mobile: "09120000000",
      employmentDate: new Date("2026-01-10T00:00:00.000Z"),
      isActive: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/people");
    expect(revalidatePath).toHaveBeenCalledWith("/people/1");
    expect(redirect).toHaveBeenCalledWith("/people/1");
  });

  it("returns invalid_form without calling the use case when personId is missing", async () => {
    const formData = createValidFormData();
    formData.delete("personId");

    const actionState = await updatePersonAction(
      initialUpdatePersonActionState,
      formData,
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeUpdatePerson).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("reads the isActive checkbox as false when absent from the form", async () => {
    const formData = createValidFormData();
    executeUpdatePerson.mockResolvedValue({
      success: true,
      person: updatedPerson,
    } satisfies UpdatePersonResult);

    await expect(
      updatePersonAction(initialUpdatePersonActionState, formData),
    ).rejects.toThrow();

    expect(executeUpdatePerson).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it("maps a validation error from the use case without redirecting", async () => {
    executeUpdatePerson.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { firstName: ["REQUIRED"] },
      },
    } satisfies UpdatePersonResult);

    const actionState = await updatePersonAction(
      initialUpdatePersonActionState,
      createValidFormData(),
    );

    expect(actionState).toEqual({
      status: "validation_error",
      fieldErrors: { firstName: ["REQUIRED"] },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps NOT_FOUND without redirecting, so the form can show the message", async () => {
    executeUpdatePerson.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies UpdatePersonResult);

    const actionState = await updatePersonAction(
      initialUpdatePersonActionState,
      createValidFormData(),
    );

    expect(actionState).toEqual({ status: "not_found" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["NATIONAL_CODE_ALREADY_EXISTS", "national_code_already_exists"],
    ["PERSONNEL_NO_ALREADY_EXISTS", "personnel_no_already_exists"],
    ["CARD_NO_ALREADY_EXISTS", "card_no_already_exists"],
  ] as const)(
    "maps %s to %s without redirecting",
    async (errorType, expectedStatus) => {
      executeUpdatePerson.mockResolvedValue({
        success: false,
        error: { type: errorType },
      } satisfies UpdatePersonResult);

      const actionState = await updatePersonAction(
        initialUpdatePersonActionState,
        createValidFormData(),
      );

      expect(actionState).toEqual({ status: expectedStatus });
      expect(redirect).not.toHaveBeenCalled();
    },
  );
});
