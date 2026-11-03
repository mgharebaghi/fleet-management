"use client";

import { useActionState, useState, type FormEvent } from "react";
import { dismissEditedFormErrors, editedFormFields, stringFormValues, type FormErrorFields } from "./editable-form-errors";

export function useEditableActionState<State>(
  action: (previous: State, data: FormData) => State | Promise<State>,
  initial: State,
  errorFields: FormErrorFields,
) {
  const [result, dispatch, pending] = useActionState<{ state: State; submitted: Record<string, string> | null }, FormData>(async (previous, data) => {
    const submitted = stringFormValues(data);
    return { state: await action(previous.state, data), submitted };
  }, { state: initial, submitted: null });
  const [edit, setEdit] = useState<{ result: typeof result; fields: Set<string> } | null>(null);
  function onInputCapture(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    // Controlled and composite fields commit their submitted value after the
    // input handler. Read that value, rather than the visible search text.
    requestAnimationFrame(() => {
      if (result.submitted && form.isConnected && !pending) setEdit({ result, fields: editedFormFields(form, result.submitted) });
    });
  }
  const state = edit?.result === result ? dismissEditedFormErrors(result.state, edit.fields, errorFields) : result.state;
  // Completion effects must observe the submitted result, not a dismissed error.
  return [state, dispatch, pending, onInputCapture, result.state] as const;
}
