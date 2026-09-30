const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizePersianNumerals(value: string): string {
  return value.replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)));
}

export function normalizePersianSearchText(value: string): string {
  return normalizePersianNumerals(value).replace(/ي/g, "ی").replace(/ك/g, "ک");
}
