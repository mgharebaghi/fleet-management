import { normalizePersianSearchText } from "../../../shared/text/persian-text";

export function normalizeTripSearchText(value: string): string {
  return normalizePersianSearchText(value.trim());
}
