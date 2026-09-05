const MILLISECONDS_PER_DAY = 86_400_000;

type GregorianDateParts = {
  year: number;
  month: number;
  day: number;
};

export type JalaliDateParts = {
  year: number;
  month: number;
  day: number;
};

export const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** The Persian week starts on Saturday. */
export const jalaliWeekdayNames = [
  "ش",
  "ی",
  "د",
  "س",
  "چ",
  "پ",
  "ج",
] as const;

function convertJalaliToGregorian(
  jalaliYear: number,
  jalaliMonth: number,
  jalaliDay: number,
): GregorianDateParts {
  const adjustedJalaliYear = jalaliYear + 1595;
  let days =
    -355668 +
    365 * adjustedJalaliYear +
    Math.floor(adjustedJalaliYear / 33) * 8 +
    Math.floor(((adjustedJalaliYear % 33) + 3) / 4) +
    jalaliDay +
    (jalaliMonth < 7
      ? (jalaliMonth - 1) * 31
      : (jalaliMonth - 7) * 30 + 186);

  let gregorianYear = 400 * Math.floor(days / 146097);
  days %= 146097;

  if (days > 36524) {
    gregorianYear += 100 * Math.floor(--days / 36524);
    days %= 36524;

    if (days >= 365) {
      days += 1;
    }
  }

  gregorianYear += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    gregorianYear += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gregorianDay = days + 1;
  const gregorianMonthLengths = [
    0,
    31,
    isGregorianLeapYear(gregorianYear) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gregorianMonth = 1;

  while (gregorianDay > gregorianMonthLengths[gregorianMonth]) {
    gregorianDay -= gregorianMonthLengths[gregorianMonth];
    gregorianMonth += 1;
  }

  return {
    year: gregorianYear,
    month: gregorianMonth,
    day: gregorianDay,
  };
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isJalaliLeapYear(year: number): boolean {
  const currentYearStart = convertJalaliToGregorian(year, 1, 1);
  const nextYearStart = convertJalaliToGregorian(year + 1, 1, 1);
  const currentYearStartTime = Date.UTC(
    currentYearStart.year,
    currentYearStart.month - 1,
    currentYearStart.day,
  );
  const nextYearStartTime = Date.UTC(
    nextYearStart.year,
    nextYearStart.month - 1,
    nextYearStart.day,
  );

  return (nextYearStartTime - currentYearStartTime) / MILLISECONDS_PER_DAY === 366;
}

export function getJalaliMonthLength(year: number, month: number): number {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month)) {
    return 0;
  }

  if (month >= 1 && month <= 6) {
    return 31;
  }

  if (month >= 7 && month <= 11) {
    return 30;
  }

  if (month === 12) {
    return isJalaliLeapYear(year) ? 30 : 29;
  }

  return 0;
}

export function jalaliToGregorianDateString(
  year: number,
  month: number,
  day: number,
): string | null {
  const monthLength = getJalaliMonthLength(year, month);

  if (!Number.isInteger(day) || day < 1 || day > monthLength) {
    return null;
  }

  const gregorianDate = convertJalaliToGregorian(year, month, day);

  return [
    gregorianDate.year.toString().padStart(4, "0"),
    gregorianDate.month.toString().padStart(2, "0"),
    gregorianDate.day.toString().padStart(2, "0"),
  ].join("-");
}

function toUtcTime(gregorianDate: string): number {
  const [year, month, day] = gregorianDate.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function getJalaliNewYearTime(jalaliYear: number): number {
  const newYear = jalaliToGregorianDateString(jalaliYear, 1, 1);

  // Year 1 onwards always converts; the guard keeps the type honest.
  return newYear === null ? Number.NaN : toUtcTime(newYear);
}

/**
 * Walks out from the usual 621-year offset instead of re-deriving the calendar,
 * so this stays exactly consistent with the forward conversion above.
 */
export function gregorianToJalali(gregorianDate: string): JalaliDateParts {
  const time = toUtcTime(gregorianDate);
  let year = Number(gregorianDate.slice(0, 4)) - 621;

  while (getJalaliNewYearTime(year) > time) {
    year -= 1;
  }

  while (getJalaliNewYearTime(year + 1) <= time) {
    year += 1;
  }

  let remainingDays = (time - getJalaliNewYearTime(year)) / MILLISECONDS_PER_DAY;
  let month = 1;

  for (;;) {
    const monthLength = getJalaliMonthLength(year, month);

    if (remainingDays < monthLength) {
      break;
    }

    remainingDays -= monthLength;
    month += 1;
  }

  return { year, month, day: remainingDays + 1 };
}

/** Index of the first day of a Jalali month within the Persian week. */
export function getJalaliMonthStartWeekday(
  jalaliYear: number,
  jalaliMonth: number,
): number {
  const firstDay = jalaliToGregorianDateString(jalaliYear, jalaliMonth, 1);

  if (firstDay === null) {
    return 0;
  }

  // getUTCDay() is Sunday-based; the Persian week starts one day earlier.
  return (new Date(toUtcTime(firstDay)).getUTCDay() + 1) % 7;
}

export function addJalaliMonths(
  parts: JalaliDateParts,
  monthOffset: number,
): JalaliDateParts {
  const monthIndex = parts.year * 12 + (parts.month - 1) + monthOffset;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;

  return {
    year,
    month,
    day: Math.min(parts.day, getJalaliMonthLength(year, month)),
  };
}

const persianNumberFormatter = new Intl.NumberFormat("fa-IR", {
  useGrouping: false,
});

export function formatJalaliNumber(value: number): string {
  return persianNumberFormatter.format(value);
}

/** The single Jalali display format used across the product. */
export function formatJalaliDate(parts: JalaliDateParts): string {
  const year = formatJalaliNumber(parts.year);
  const month = formatJalaliNumber(parts.month).padStart(2, "۰");
  const day = formatJalaliNumber(parts.day).padStart(2, "۰");

  return `${year}/${month}/${day}`;
}

export function formatGregorianDateAsJalali(gregorianDate: string): string {
  return formatJalaliDate(gregorianToJalali(gregorianDate));
}
