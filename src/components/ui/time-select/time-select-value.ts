export type TimeParts = {
  hour: number;
  minute: number;
};

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function toPersianDigits(value: string): string {
  return value.replace(/\d/g, (digit) => persianDigits[Number(digit)] ?? digit);
}

export function latinDigits(raw: string): string {
  return raw
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persianIndex = persianDigits.indexOf(digit);
      if (persianIndex >= 0) {
        return String(persianIndex);
      }
      const arabicIndex = arabicDigits.indexOf(digit);
      return arabicIndex >= 0 ? String(arabicIndex) : "";
    })
    .replace(/\D/g, "");
}

export function padTimePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseCanonicalTime(value: string): TimeParts | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatCanonicalTime(parts: TimeParts | null): string {
  if (!parts) {
    return "";
  }
  return `${padTimePart(parts.hour)}:${padTimePart(parts.minute)}`;
}

export function formatPersianTime(parts: TimeParts | null): string | null {
  const canonical = formatCanonicalTime(parts);
  return canonical ? toPersianDigits(canonical) : null;
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(max, Math.max(0, value));
}

/**
 * Accepts a typed hour. A single digit above 2 is complete (۳–۹). Two digits
 * are clamped to 00–23 so an invalid hour is never returned.
 */
export function readHourInput(raw: string): {
  text: string;
  hour: number | null;
  complete: boolean;
} {
  const digits = latinDigits(raw).slice(0, 2);
  if (!digits) {
    return { text: "", hour: null, complete: false };
  }
  if (digits.length === 1) {
    const hour = Number(digits);
    if (hour > 2) {
      return { text: padTimePart(hour), hour, complete: true };
    }
    return { text: digits, hour, complete: false };
  }
  const hour = clamp(Number(digits), 23);
  return { text: padTimePart(hour), hour, complete: true };
}

/**
 * Accepts a typed minute. A single digit above 5 is complete. Two digits are
 * clamped to 00–59.
 */
export function readMinuteInput(raw: string): {
  text: string;
  minute: number | null;
  complete: boolean;
} {
  const digits = latinDigits(raw).slice(0, 2);
  if (!digits) {
    return { text: "", minute: null, complete: false };
  }
  if (digits.length === 1) {
    const minute = Number(digits);
    if (minute > 5) {
      return { text: padTimePart(minute), minute, complete: true };
    }
    return { text: digits, minute, complete: false };
  }
  const minute = clamp(Number(digits), 59);
  return { text: padTimePart(minute), minute, complete: true };
}

export function commitHourText(raw: string): number | null {
  const digits = latinDigits(raw).slice(0, 2);
  if (!digits) {
    return null;
  }
  return clamp(Number(digits), 23);
}

export function commitMinuteText(raw: string): number | null {
  const digits = latinDigits(raw).slice(0, 2);
  if (!digits) {
    return null;
  }
  return clamp(Number(digits), 59);
}

export function stepHour(hour: number | null, delta: 1 | -1): number {
  const base = hour ?? (delta > 0 ? -1 : 0);
  return (base + delta + 24) % 24;
}

export function stepMinute(minute: number | null, delta: 1 | -1): number {
  const base = minute ?? (delta > 0 ? -1 : 0);
  return (base + delta + 60) % 60;
}

export function withMinuteShortcut(
  current: TimeParts | null,
  minute: number,
): TimeParts {
  return {
    hour: current?.hour ?? 0,
    minute: clamp(minute, 59),
  };
}

export function composeCanonical(
  hour: number | null,
  minute: number | null,
): string {
  if (hour === null || minute === null) {
    return "";
  }
  return formatCanonicalTime({
    hour: clamp(hour, 23),
    minute: clamp(minute, 59),
  });
}

export const QUICK_MINUTES = [0, 15, 30, 45] as const;
