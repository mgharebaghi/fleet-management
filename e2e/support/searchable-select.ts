import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

type Scope = Page | Locator;

/**
 * Drives any shared `SearchableSelect`: opens it from its labeled trigger,
 * filters by the given query and clicks the option whose visible text
 * contains `optionText`. Pass a `Locator` as `scope` (e.g. a dialog) when the
 * field lives inside a nested `role="dialog"`, so the search panel resolves
 * to the right one.
 */
export async function selectSearchableOption(
  scope: Scope,
  fieldLabel: string,
  query: string,
  optionText: string,
): Promise<void> {
  await scope.getByLabel(fieldLabel, { exact: true }).click();
  const panel = scope.getByRole("dialog", { name: `جستجوی ${fieldLabel}` });
  await panel.getByRole("combobox").fill(query);
  await panel.getByRole("option", { name: optionText }).click();
}

/** The searchable select's collapsed trigger, addressed by its label. */
export function searchableSelectTrigger(scope: Scope, fieldLabel: string): Locator {
  return scope.getByLabel(fieldLabel, { exact: true });
}

export async function expectSearchableSelectValue(scope: Scope, fieldName: string, value: string): Promise<void> {
  await expect(scope.locator(`input[type="hidden"][name="${fieldName}"]`)).toHaveValue(value);
}
