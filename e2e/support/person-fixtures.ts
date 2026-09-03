import { randomInt, randomUUID } from "node:crypto";

export function createValidIranianNationalCode(): string {
  let firstNineDigits = randomInt(0, 1_000_000_000)
    .toString()
    .padStart(9, "0");

  while (/^(\d)\1{8}$/.test(firstNineDigits)) {
    firstNineDigits = randomInt(0, 1_000_000_000)
      .toString()
      .padStart(9, "0");
  }

  const weightedSum = firstNineDigits
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * (10 - index), 0);
  const remainder = weightedSum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return `${firstNineDigits}${checkDigit}`;
}

export function createUniqueToken(): string {
  return randomUUID().replaceAll("-", "").slice(0, 10);
}
