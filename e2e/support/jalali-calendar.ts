import { expect, type Locator } from "@playwright/test";
import { jalaliMonthNames } from "../../src/components/ui/date-picker/jalali-date";

/** Select distant dates through the same direct month/year controls as the UI. */
export async function selectJalaliDate(
  panel: Locator,
  year: number,
  monthName: string,
  day: string,
): Promise<void> {
  const yearInput = panel.getByRole("textbox", { name: "سال تقویم" });
  await yearInput.fill(String(year));
  await yearInput.press("Enter");
  await expect(yearInput).toHaveValue(String(year));
  const month = jalaliMonthNames.indexOf(monthName as (typeof jalaliMonthNames)[number]) + 1;
  await panel.getByRole("combobox", { name: "ماه تقویم" }).selectOption(String(month));
  await panel.getByRole("button", { name: day, exact: true }).click();
}
