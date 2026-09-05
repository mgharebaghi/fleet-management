import { expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

function toPersianDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

/**
 * Drives an open calendar panel to a Jalali date by stepping months, so the
 * tests exercise the same navigation a user has.
 */
export async function selectJalaliDate(
  panel: Locator,
  year: number,
  monthName: string,
  day: string,
): Promise<void> {
  const heading = `${monthName} ${toPersianDigits(year)}`;

  for (let step = 0; step < 240; step += 1) {
    if ((await panel.getByText(heading, { exact: true }).count()) > 0) {
      break;
    }

    await panel.getByRole("button", { name: "ماه قبل" }).click();
  }

  await expect(panel.getByText(heading, { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: day, exact: true }).click();
}
