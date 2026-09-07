/**
 * Iranian national-code checksum, shared by Create and Update so the rule
 * cannot silently diverge between the two entry points.
 */
export function isValidIranianNationalCode(nationalCode: string): boolean {
  if (!/^\d{10}$/.test(nationalCode) || /^(\d)\1{9}$/.test(nationalCode)) {
    return false;
  }

  const checkDigit = Number(nationalCode[9]);
  const weightedSum = nationalCode
    .slice(0, 9)
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const remainder = weightedSum % 11;
  const expectedCheckDigit = remainder < 2 ? remainder : 11 - remainder;

  return checkDigit === expectedCheckDigit;
}
