const MILLISECONDS_PER_DAY = 86_400_000;

type GregorianDateParts = {
  year: number;
  month: number;
  day: number;
};

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

function normalizePersianDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - "۰".charCodeAt(0) + 48),
    )
    .replace(/[٠-٩]/g, (digit) =>
      String.fromCharCode(digit.charCodeAt(0) - "٠".charCodeAt(0) + 48),
    );
}

export function getGregorianEmploymentDateValue(
  jalaliYear: string,
  jalaliMonth: string,
  jalaliDay: string,
): string {
  if (jalaliYear === "" && jalaliMonth === "" && jalaliDay === "") {
    return "";
  }

  if (jalaliYear === "" || jalaliMonth === "" || jalaliDay === "") {
    return "invalid";
  }

  const normalizedYear = normalizePersianDigits(jalaliYear.trim());

  if (!/^\d+$/.test(normalizedYear)) {
    return "invalid";
  }

  return (
    jalaliToGregorianDateString(
      Number(normalizedYear),
      Number(jalaliMonth),
      Number(jalaliDay),
    ) ?? "invalid"
  );
}
