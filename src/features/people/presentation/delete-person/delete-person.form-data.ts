export type ParseDeletePersonFormDataResult =
  | { success: true; personId: number }
  | { success: false };

export function parseDeletePersonFormData(
  formData: FormData,
): ParseDeletePersonFormDataResult {
  const personIdValue = formData.get("personId");

  if (typeof personIdValue !== "string") {
    return { success: false };
  }

  const personId = Number(personIdValue);
  if (!Number.isInteger(personId) || personId <= 0) {
    return { success: false };
  }

  return { success: true, personId };
}
