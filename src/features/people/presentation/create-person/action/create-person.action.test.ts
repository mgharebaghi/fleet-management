import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreatePersonResult } from "../../../application/create-person/create-person.contract";
import type { Person } from "../../../application/person";
import { createPersonAction } from "./create-person.action";
import { initialCreatePersonActionState } from "./create-person.action-state";

const { executeCreatePerson, makeCreatePerson, redirect, revalidatePath } =
  vi.hoisted(() => ({
    executeCreatePerson: vi.fn(),
    makeCreatePerson: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../composition/create-person.factory", () => ({
  makeCreatePerson,
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

const createdPerson: Person = {
  personId: 1,
  personnelNo: "P-100",
  firstName: "Ali",
  lastName: "Ahmadi",
  nationalCode: "0012345679",
  cardNo: "C-100",
  mobile: "09120000000",
  employmentDate: new Date("2026-01-10T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date("2026-01-11T08:00:00.000Z"),
};

function createValidFormData(): FormData {
  const formData = new FormData();
  formData.set("personnelNo", "P-100");
  formData.set("firstName", "Ali");
  formData.set("lastName", "Ahmadi");
  formData.set("nationalCode", "0012345679");
  formData.set("cardNo", "C-100");
  formData.set("mobile", "09120000000");
  formData.set("employmentDate", "2026-01-10");

  return formData;
}

describe("createPersonAction", () => {
  beforeEach(() => {
    executeCreatePerson.mockReset();
    makeCreatePerson.mockReset();
    makeCreatePerson.mockReturnValue({ execute: executeCreatePerson });
    redirect.mockClear();
    revalidatePath.mockClear();
  });

  it("revalidates and redirects to /people after a successful create, without swallowing the redirect", async () => {
    executeCreatePerson.mockResolvedValue({
      success: true,
      person: createdPerson,
    } satisfies CreatePersonResult);

    await expect(
      createPersonAction(
        initialCreatePersonActionState,
        createValidFormData(),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/people");

    expect(executeCreatePerson).toHaveBeenCalledWith({
      personnelNo: "P-100",
      firstName: "Ali",
      lastName: "Ahmadi",
      nationalCode: "0012345679",
      cardNo: "C-100",
      mobile: "09120000000",
      employmentDate: new Date("2026-01-10T00:00:00.000Z"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/people");
    expect(redirect).toHaveBeenCalledWith("/people");
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("maps absent optional form fields to null", async () => {
    const formData = new FormData();
    formData.set("firstName", "Ali");
    formData.set("lastName", "Ahmadi");
    executeCreatePerson.mockResolvedValue({
      success: true,
      person: { ...createdPerson, employmentDate: null },
    } satisfies CreatePersonResult);

    await expect(
      createPersonAction(initialCreatePersonActionState, formData),
    ).rejects.toThrow();

    expect(executeCreatePerson).toHaveBeenCalledWith({
      personnelNo: null,
      firstName: "Ali",
      lastName: "Ahmadi",
      nationalCode: null,
      cardNo: null,
      mobile: null,
      employmentDate: null,
    });
  });

  it("maps blank optional form fields to null", async () => {
    const formData = createValidFormData();
    formData.set("personnelNo", "");
    formData.set("nationalCode", "");
    formData.set("cardNo", "");
    formData.set("mobile", "");
    formData.set("employmentDate", "");
    executeCreatePerson.mockResolvedValue({
      success: true,
      person: {
        ...createdPerson,
        personnelNo: null,
        nationalCode: null,
        cardNo: null,
        mobile: null,
        employmentDate: null,
      },
    } satisfies CreatePersonResult);

    await expect(
      createPersonAction(initialCreatePersonActionState, formData),
    ).rejects.toThrow();

    expect(executeCreatePerson).toHaveBeenCalledWith({
      personnelNo: null,
      firstName: "Ali",
      lastName: "Ahmadi",
      nationalCode: null,
      cardNo: null,
      mobile: null,
      employmentDate: null,
    });
  });

  it("returns invalid form without creating the use case or redirecting when a required entry is absent", async () => {
    const formData = createValidFormData();
    formData.delete("firstName");

    const actionState = await createPersonAction(
      initialCreatePersonActionState,
      formData,
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeCreatePerson).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("leaves content validation and normalization to Application and does not redirect", async () => {
    const formData = createValidFormData();
    formData.set("firstName", " ");
    executeCreatePerson.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { firstName: ["REQUIRED"] },
      },
    } satisfies CreatePersonResult);

    const actionState = await createPersonAction(
      initialCreatePersonActionState,
      formData,
    );

    expect(executeCreatePerson).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: " " }),
    );
    expect(actionState).toEqual({
      status: "validation_error",
      fieldErrors: { firstName: ["REQUIRED"] },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("passes an invalid date to Application validation and does not redirect", async () => {
    const formData = createValidFormData();
    formData.set("employmentDate", "2026-02-31");
    executeCreatePerson.mockResolvedValue({
      success: false,
      error: {
        type: "VALIDATION_ERROR",
        fieldErrors: { employmentDate: ["INVALID_DATE"] },
      },
    } satisfies CreatePersonResult);

    const actionState = await createPersonAction(
      initialCreatePersonActionState,
      formData,
    );

    const receivedInput = executeCreatePerson.mock.calls[0]?.[0];
    expect(receivedInput.employmentDate).toBeInstanceOf(Date);
    expect(Number.isNaN(receivedInput.employmentDate.getTime())).toBe(true);
    expect(actionState).toEqual({
      status: "validation_error",
      fieldErrors: { employmentDate: ["INVALID_DATE"] },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["NATIONAL_CODE_ALREADY_EXISTS", "national_code_already_exists"],
    ["PERSONNEL_NO_ALREADY_EXISTS", "personnel_no_already_exists"],
    ["CARD_NO_ALREADY_EXISTS", "card_no_already_exists"],
  ] as const)(
    "maps %s to %s without redirecting",
    async (errorType, expectedStatus) => {
      executeCreatePerson.mockResolvedValue({
        success: false,
        error: { type: errorType },
      } satisfies CreatePersonResult);

      const actionState = await createPersonAction(
        initialCreatePersonActionState,
        createValidFormData(),
      );

      expect(actionState).toEqual({ status: expectedStatus });
      expect(redirect).not.toHaveBeenCalled();
    },
  );
});
