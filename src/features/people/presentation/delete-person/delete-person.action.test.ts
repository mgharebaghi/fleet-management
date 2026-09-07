import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeletePersonResult } from "../../application/delete-person/delete-person.contract";
import { deletePersonAction } from "./delete-person.action";
import { initialDeletePersonActionState } from "./delete-person.action-state";

const { executeDeletePerson, makeDeletePerson, redirect, revalidatePath } =
  vi.hoisted(() => ({
    executeDeletePerson: vi.fn(),
    makeDeletePerson: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../composition/person.factory", () => ({
  makeDeletePerson,
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

function createFormData(personId: string): FormData {
  const formData = new FormData();
  formData.set("personId", personId);
  return formData;
}

describe("deletePersonAction", () => {
  beforeEach(() => {
    executeDeletePerson.mockReset();
    makeDeletePerson.mockReset();
    makeDeletePerson.mockReturnValue({ execute: executeDeletePerson });
    redirect.mockClear();
    revalidatePath.mockClear();
  });

  it("revalidates and redirects to /people after a successful delete", async () => {
    executeDeletePerson.mockResolvedValue({
      success: true,
    } satisfies DeletePersonResult);

    await expect(
      deletePersonAction(initialDeletePersonActionState, createFormData("1")),
    ).rejects.toThrow("NEXT_REDIRECT:/people");

    expect(executeDeletePerson).toHaveBeenCalledWith(1);
    expect(revalidatePath).toHaveBeenCalledWith("/people");
    expect(redirect).toHaveBeenCalledWith("/people");
  });

  it("returns invalid_form without calling the use case when personId is missing", async () => {
    const actionState = await deletePersonAction(
      initialDeletePersonActionState,
      new FormData(),
    );

    expect(actionState).toEqual({ status: "invalid_form" });
    expect(makeDeletePerson).not.toHaveBeenCalled();
  });

  it("reports referenced without redirecting when the person still has a driver record", async () => {
    executeDeletePerson.mockResolvedValue({
      success: false,
      error: { type: "REFERENCED" },
    } satisfies DeletePersonResult);

    const actionState = await deletePersonAction(
      initialDeletePersonActionState,
      createFormData("1"),
    );

    expect(actionState).toEqual({ status: "referenced" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /people when the person was already deleted", async () => {
    executeDeletePerson.mockResolvedValue({
      success: false,
      error: { type: "NOT_FOUND" },
    } satisfies DeletePersonResult);

    await expect(
      deletePersonAction(initialDeletePersonActionState, createFormData("1")),
    ).rejects.toThrow("NEXT_REDIRECT:/people");
  });
});
