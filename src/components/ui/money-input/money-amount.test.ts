import { describe, expect, it } from "vitest";

import {
  countDigitsBefore,
  findCaretAfterDigits,
  formatMoneyAmount,
  normalizeMoneyAmount,
} from "./money-amount";

describe("normalizeMoneyAmount", () => {
  it("strips the grouping separators a user may type or paste", () => {
    expect(normalizeMoneyAmount("12,500,000")).toBe("12500000");
  });

  it("folds Persian and Arabic digits and separators", () => {
    expect(normalizeMoneyAmount("۱۲۵۰۰")).toBe("12500");
    expect(normalizeMoneyAmount("١٢٥٠٠")).toBe("12500");
    expect(normalizeMoneyAmount("۱۲٫۳۴")).toBe("12.34");
  });

  it("keeps a single decimal point and drops stray ones", () => {
    expect(normalizeMoneyAmount("1.2.3")).toBe("1.23");
  });

  it("keeps zero and an untouched optional field distinguishable", () => {
    expect(normalizeMoneyAmount("0")).toBe("0");
    expect(normalizeMoneyAmount("")).toBe("");
  });

  it("removes anything that is not part of a decimal", () => {
    expect(normalizeMoneyAmount("12500000 تومان")).toBe("12500000");
    expect(normalizeMoneyAmount("-5")).toBe("5");
  });
});

describe("formatMoneyAmount", () => {
  it("groups the integer digits in threes", () => {
    expect(formatMoneyAmount("12500000")).toBe("12,500,000");
  });

  it("leaves short values and an empty value alone", () => {
    expect(formatMoneyAmount("500")).toBe("500");
    expect(formatMoneyAmount("0")).toBe("0");
    expect(formatMoneyAmount("")).toBe("");
  });

  it("groups only the integer part and preserves the decimals as typed", () => {
    expect(formatMoneyAmount("1234567.89")).toBe("1,234,567.89");
    expect(formatMoneyAmount("1234567.50")).toBe("1,234,567.50");
  });

  it("keeps every digit of a value beyond Number's safe range", () => {
    // decimal(18,2) allows sixteen integer digits, well past 2^53.
    expect(formatMoneyAmount("9999999999999999.99")).toBe(
      "9,999,999,999,999,999.99",
    );
  });
});

describe("caret preservation", () => {
  it("counts the digits before the caret, ignoring separators", () => {
    expect(countDigitsBefore("12,500,000", 6)).toBe(5);
    expect(countDigitsBefore("12,500,000", 0)).toBe(0);
  });

  it("finds the position just after the same digit count", () => {
    expect(findCaretAfterDigits("125,000", 4)).toBe(5);
    expect(findCaretAfterDigits("125,000", 0)).toBe(0);
    expect(findCaretAfterDigits("125,000", 99)).toBe(7);
  });
});
