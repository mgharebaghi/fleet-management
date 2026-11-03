export function referenceTextFields(data: FormData, fields: readonly string[]): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const name of fields) {
    const entries = data.getAll(name);
    if (entries.length !== 1 || typeof entries[0] !== "string") return null;
    result[name] = entries[0];
  }
  return result;
}
export function referenceCheckbox(data: FormData, name: string): boolean | null {
  const entries = data.getAll(name);
  return entries.length === 0 ? false : entries.length === 1 && entries[0] === "on" ? true : null;
}
