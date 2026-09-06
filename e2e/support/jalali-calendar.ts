import { expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

import { jalaliMonthNames } from "../../src/components/ui/date-picker/jalali-date";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

function fromPersianDigits(value: string): number {
  return Number(
    value.replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit))),
  );
}

/** Absolute month index (year * 12 + zero-based month) for ordering headings. */
function monthIndex(year: number, monthName: string): number {
  return year * 12 + jalaliMonthNames.indexOf(monthName as (typeof jalaliMonthNames)[number]);
}

const headingPattern = new RegExp(
  `^(${jalaliMonthNames.join("|")}) [۰-۹]+$`,
);

async function readVisibleHeading(panel: Locator): Promise<{ year: number; monthName: string }> {
  const text = await panel.getByText(headingPattern).first().textContent();
  const [monthName, persianYear] = (text ?? "").trim().split(/\s+/);

  return { year: fromPersianDigits(persianYear), monthName };
}

/**
 * Drives an open calendar panel to a Jalali date by stepping months toward
 * the target (forward via "ماه بعد", backward via "ماه قبل"), so the tests
 * exercise the same navigation a user has in both directions.
 */
export async function selectJalaliDate(
  panel: Locator,
  year: number,
  monthName: string,
  day: string,
): Promise<void> {
  const heading = `${monthName} ${toPersianDigits(year)}`;
  const targetIndex = monthIndex(year, monthName);

  const current = await readVisibleHeading(panel);
  const stepCount = targetIndex - monthIndex(current.year, current.monthName);
  const buttonName = stepCount >= 0 ? "ماه بعد" : "ماه قبل";

  for (let step = 0; step < Math.abs(stepCount); step += 1) {
    await panel.getByRole("button", { name: buttonName }).click();
  }

  await expect(panel.getByText(heading, { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: day, exact: true }).click();
}
