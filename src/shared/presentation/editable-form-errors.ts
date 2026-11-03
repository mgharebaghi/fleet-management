export type EditedFormFields = ReadonlySet<string>;
export type FormErrorFields = Readonly<Record<string, readonly string[]>>;

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Dismiss stale field feedback; preserve unrelated failures and submitted values. */
export function dismissEditedFormErrors<State>(state: State, edited: EditedFormFields, errorFields: FormErrorFields): State {
  if (!record(state) || edited.size === 0) return state;
  const next: Record<string, unknown> = { ...state };
  const changed = (key: unknown) => typeof key === "string" && errorFields[key]?.some(field => edited.has(field));
  const remaining = (fields: Record<string, unknown>) => Object.fromEntries(Object.entries(fields).filter(([field]) => !edited.has(field)));
  if (record(next.fieldErrors)) {
    const fields = remaining(next.fieldErrors);
    if (Object.keys(fields).length === 0) { delete next.fieldErrors; next.status = "idle"; }
    else next.fieldErrors = fields;
  }
  if (record(next.error) && next.error.type === "VALIDATION_ERROR") {
    const key = record(next.error.fieldErrors) ? "fieldErrors" : "fields";
    if (record(next.error[key])) {
      const fields = remaining(next.error[key]);
      if (Object.keys(fields).length === 0) { delete next.error; if (next.status === "failed") next.status = "idle"; }
      else next.error = { ...next.error, [key]: fields };
    }
  } else if (changed(next.status)) {
    next.status = "idle";
  } else if (changed(record(next.error) ? next.error.type : next.error) || (typeof next.field === "string" && edited.has(next.field))) {
    delete next.error; delete next.field;
    if (next.status === "failed") next.status = "idle";
  }
  return next as State;
}

export function stringFormValues(data: FormData): Record<string, string> {
  return Object.fromEntries([...data.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string" && !entry[0].startsWith("$ACTION_")));
}

export function editedFormFields(form: HTMLFormElement, submitted: Readonly<Record<string, string>>): Set<string> {
  const values = stringFormValues(new FormData(form));
  return new Set(Object.entries(values).filter(([name, value]) => {
    if (value === submitted[name]) return false;
    const control = form.elements.namedItem(name);
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement) {
      if (!control.validity.valid || ((control.required || control.dataset.required === "true") && value.trim() === "")) return false;
    }
    return true;
  }).map(([name]) => name));
}
