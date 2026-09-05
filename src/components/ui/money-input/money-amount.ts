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

/**
 * Groups the integer digits in threes. Works on the string itself so a value
 * beyond Number's safe range keeps every digit it was given.
 */
export function formatMoneyAmount(value: string): string {
  if (value === "") {
    return "";
  }

  const [integerPart, decimalPart] = value.split(".");
  const groupedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  return decimalPart === undefined
    ? groupedInteger
    : `${groupedInteger}.${decimalPart}`;
}

/** Counts digits before a caret so grouping can keep the caret in place. */
export function countDigitsBefore(value: string, caretIndex: number): number {
  let digits = 0;

  for (let index = 0; index < caretIndex && index < value.length; index += 1) {
    if (value[index] >= "0" && value[index] <= "9") {
      digits += 1;
    }
  }

  return digits;
}

/** Position in a formatted value that sits just after `digitCount` digits. */
export function findCaretAfterDigits(
  formattedValue: string,
  digitCount: number,
): number {
  if (digitCount === 0) {
    return 0;
  }

  let digits = 0;

  for (let index = 0; index < formattedValue.length; index += 1) {
    const character = formattedValue[index];

    if (character >= "0" && character <= "9") {
      digits += 1;

      if (digits === digitCount) {
        return index + 1;
      }
    }
  }

  return formattedValue.length;
}
