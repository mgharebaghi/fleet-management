const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

/**
 * Turns whatever the user typed into the plain decimal the Application expects:
 * Latin digits, no grouping separators, at most one decimal point.
 */
export function normalizeMoneyAmount(value: string): string {
  const digitsOnly = value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[٫،]/g, ".")
    .replace(/[^0-9.]/g, "");

  const [integerPart, ...decimalParts] = digitsOnly.split(".");

  return decimalParts.length === 0
    ? integerPart
    : `${integerPart}.${decimalParts.join("")}`;
}

export { formatDecimalAmount as formatMoneyAmount, countDigitsBefore, findCaretAfterDigits } from "../decimal-input/decimal-format";
