export const LOCATION_TYPE_SUGGESTIONS = [
  "دفتر مرکزی",
  "شرکت تابعه",
  "شعبه / نمایندگی",
  "کارخانه / سایت عملیاتی",
  "انبار",
  "پروژه / کارگاه",
  "سازمان / اداره",
  "فرودگاه / پایانه",
] as const;

export function proposeLocationName(
  current: string,
  edited: boolean,
  title: string,
): { value: string; edited: boolean } {
  const suggestion = title.trim();
  if (!suggestion || edited || current.trim() !== "") {
    return { value: current, edited };
  }
  return { value: suggestion, edited: false };
}

export function proposeLocationAddress(
  current: string,
  edited: boolean,
  suggestion: string | null,
  nextAddress: string,
): { value: string; edited: boolean; suggestion: string | null } {
  const incoming = nextAddress.trim();
  if (!incoming) return { value: current, edited, suggestion };
  if (!edited) return { value: incoming, edited: false, suggestion: null };
  if (current.trim() === incoming) {
    return { value: current, edited, suggestion: null };
  }
  return { value: current, edited, suggestion: incoming };
}

export function acceptAddressSuggestion(
  current: string,
  edited: boolean,
  suggestion: string | null,
): { value: string; edited: boolean; suggestion: string | null } {
  if (!suggestion) return { value: current, edited, suggestion };
  return { value: suggestion, edited: true, suggestion: null };
}
