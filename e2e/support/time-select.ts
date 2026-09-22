import { expect, type Locator, type Page } from "@playwright/test";

type Scope = Page | Locator;

function ownerPage(scope: Scope): Page {
  return "goto" in scope ? scope : scope.page();
}

/**
 * Sets a shared TimeSelect to a canonical `HH:mm` value: opens the labelled
 * trigger, types the hour and minute, then closes the popover by activating
 * the trigger again. Escape is avoided because a surrounding dialog treats it
 * as a request to close itself.
 */
export async function setTime(
  scope: Scope,
  fieldLabel: string,
  value: string,
): Promise<void> {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error(`Time must be HH:mm, received ${value}.`);
  }
  const [, hour, minute] = match;
  const trigger = scope.getByRole("button", { name: fieldLabel, exact: true });

  await trigger.click();
  const panel = ownerPage(scope).getByRole("dialog", {
    name: `انتخاب ${fieldLabel}`,
    exact: true,
  });
  await panel.getByRole("textbox", { name: "ساعت", exact: true }).fill(hour);
  await panel.getByRole("textbox", { name: "دقیقه", exact: true }).fill(minute);
  await trigger.click();
  await expect(panel).toBeHidden();
}
