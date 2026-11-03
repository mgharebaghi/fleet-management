"use client";

import { useEditableActionState } from "../../../shared/presentation/use-editable-action-state";

const errorFields = {
  national_code_already_exists: ["nationalCode"],
  personnel_no_already_exists: ["personnelNo"],
  card_no_already_exists: ["cardNo"]
} as const;

export function usePeopleFormState<State>(action: (previous: State, data: FormData) => State | Promise<State>, initial: State) {
  return useEditableActionState(action, initial, errorFields);
}
