import type { UpdatePersonInput } from "../../../application/update-person/update-person.contract";

export type ParseUpdatePersonFormDataResult =
  | { success: true; input: UpdatePersonInput }
  | { success: false };

function readFormString(
  formData: FormData,
  fieldName: string,
  required: true,
): string | undefined;
function readFormString(
  formData: FormData,
  fieldName: string,
  required: false,
): string | null | undefined;
function readFormString(
  formData: FormData,
  fieldName: string,
  required: boolean,
): string | null | undefined {
  const formValue = formData.get(fieldName);

  if (formValue === null) {
    return required ? undefined : null;
  }

  if (typeof formValue !== "string") {
    return undefined;
  }

  if (!required && formValue.length === 0) {
    return null;
  }

  return formValue;
}

function parseEmploymentDate(value: string | null): Date | null {
  if (value === null || value.length === 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(Number.NaN);
  }

  const employmentDate = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(employmentDate.getTime()) ||
    employmentDate.toISOString().slice(0, 10) !== value
  ) {
    return new Date(Number.NaN);
  }

  return employmentDate;
}

export function parseUpdatePersonFormData(
  formData: FormData,
): ParseUpdatePersonFormDataResult {
  const personIdValue = formData.get("personId");
  const personnelNo = readFormString(formData, "personnelNo", false);
  const firstName = readFormString(formData, "firstName", true);
  const lastName = readFormString(formData, "lastName", true);
  const nationalCode = readFormString(formData, "nationalCode", false);
  const cardNo = readFormString(formData, "cardNo", false);
  const mobile = readFormString(formData, "mobile", false);
  const employmentDate = readFormString(formData, "employmentDate", false);

  if (
    typeof personIdValue !== "string" ||
    personnelNo === undefined ||
    firstName === undefined ||
    lastName === undefined ||
    nationalCode === undefined ||
    cardNo === undefined ||
    mobile === undefined ||
    employmentDate === undefined
  ) {
    return { success: false };
  }

  const personId = Number(personIdValue);
  if (!Number.isInteger(personId) || personId <= 0) {
    return { success: false };
  }

  return {
    success: true,
    input: {
      personId,
      personnelNo,
      firstName,
      lastName,
      nationalCode,
      cardNo,
      mobile,
      employmentDate: parseEmploymentDate(employmentDate),
      isActive: formData.get("isActive") === "on",
    },
  };
}
