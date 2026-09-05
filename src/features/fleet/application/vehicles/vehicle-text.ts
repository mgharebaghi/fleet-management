const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

/** Digits only: identifiers are stored with Latin digits. */
export function normalizeVehicleNumerals(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
}

/**
 * Vehicle search spans technical identifiers and Persian catalog names, so it
 * folds the Arabic letter forms a keyboard may produce as well as the digits.
 */
export function normalizeVehicleSearchText(value: string): string {
  return normalizeVehicleNumerals(value)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک");
}
