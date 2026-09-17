import type { TripFailure } from "../application/trip-records";

export type TripActionState = {
  error?: TripFailure | "INVALID_FORM" | "UNEXPECTED";
  values?: Record<string, string>;
};

export function tripFormValues(
  data: FormData,
): Record<string, string> | null {
  const values: Record<string, string> = {};

  for (const [name, value] of data.entries()) {
    if (name.startsWith("$ACTION_")) continue;
    if (typeof value !== "string" || name in values) return null;
    values[name] = value;
  }

  return values;
}

export function parseOptionalInteger(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  return /^-?\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(Number.NaN);
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : new Date(Number.NaN);
}

export function parseTehranDateTime(
  day: string | undefined,
  time: string | undefined,
): Date | null {
  if (!day && !time) return null;
  const date = parseDate(day);
  if (
    !date ||
    !Number.isFinite(date.getTime()) ||
    !time ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    return new Date(Number.NaN);
  }

  const wallTime = new Date(`${day}T${time}:00Z`).getTime();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const asWallTime = (instant: number) => {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value]),
    );
    return new Date(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    ).getTime();
  };

  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    instant += wallTime - asWallTime(instant);
  }
  return asWallTime(instant) === wallTime
    ? new Date(instant)
    : new Date(Number.NaN);
}

export const tripMessages: Record<
  TripFailure | "INVALID_FORM" | "UNEXPECTED",
  string
> = {
  INVALID_ID: "یک گزینهٔ معتبر انتخاب کنید.",
  REQUEST_SEQUENCE_EXHAUSTED:
    "ظرفیت شماره‌گذاری چهاررقمی درخواست‌ها در این سال تکمیل شده است.",
  REQUEST_NO_DUPLICATE:
    "شمارهٔ تولیدشده هم‌اکنون موجود است؛ درخواست را دوباره ثبت کنید.",
  REQUEST_TYPE_NOT_FOUND: "نوع درخواست انتخاب‌شده موجود نیست.",
  REQUEST_NOT_FOUND: "درخواست سفر موجود نیست.",
  INVALID_REQUEST_STATUS: "وضعیت فعلی یا مقصد درخواست معتبر نیست.",
  INVALID_REQUEST_TRANSITION:
    "این تغییر وضعیت مجاز نیست؛ وضعیت‌ها فقط رو به جلو حرکت می‌کنند و لغو پس از شروع اجرا ممکن نیست.",
  INVALID_DATE: "تاریخ و ساعت معتبر وارد کنید.",
  PURPOSE_TOO_LONG: "هدف سفر حداکثر ۵۰۰ نویسه است.",
  PASSENGER_REQUIRED: "حداقل یک مسافر اضافه کنید.",
  PERSON_NOT_FOUND: "مسافر انتخاب‌شده موجود نیست.",
  PERSON_INACTIVE: "شخص غیرفعال را نمی‌توان به درخواست جدید افزود.",
  LOCATION_NOT_FOUND: "مکان انتخاب‌شده موجود نیست.",
  LOCATION_INACTIVE: "مکان غیرفعال را نمی‌توان در درخواست جدید استفاده کرد.",
  INVALID_ORDER: "ترتیب سوار یا پیاده‌شدن باید عدد صحیح معتبر باشد.",
  TRIP_STATUS_TOO_LONG: "وضعیت مسافر حداکثر ۵۰ نویسه است.",
  COMMON_ORIGIN_REQUIRED:
    "برای این نوع درخواست، مبدأ همهٔ مسافران باید یکسان باشد.",
  COMMON_DESTINATION_REQUIRED:
    "برای این نوع درخواست، مقصد همهٔ مسافران باید یکسان باشد.",
  TRIP_NOT_FOUND: "سفر مسافر موجود نیست.",
  ROUTE_NAME_REQUIRED: "نام مسیر را وارد کنید.",
  ROUTE_NAME_TOO_LONG: "نام مسیر حداکثر ۲۰۰ نویسه است.",
  INVALID_ROUTE_NUMBER: "شمارهٔ مسیر جایگزین باید عدد صحیح مثبت باشد.",
  INVALID_DISTANCE: "مسافت باید عدد نامنفی با حداکثر ۸ رقم صحیح و ۲ اعشار باشد.",
  INVALID_DURATION: "مدت تخمینی باید عدد صحیح نامنفی باشد.",
  INVALID_SEQUENCE: "ترتیب نقطهٔ مسیر باید عدد صحیح مثبت باشد.",
  TRAFFIC_ZONE_TOO_LONG: "محدودهٔ ترافیکی حداکثر ۵۰ نویسه است.",
  ASSIGNMENT_NOT_FOUND: "تخصیص خودرو و راننده موجود نیست.",
  ASSIGNMENT_NOT_ACTIVE:
    "تخصیص انتخاب‌شده در زمان برنامه‌ریزی‌شدهٔ این سفر فعال نیست.",
  NO_ELIGIBLE_LICENSE:
    "راننده در روز سفر گواهینامهٔ فعال و معتبر ندارد.",
  EXECUTION_NOT_FOUND: "رکورد اجرای سفر موجود نیست یا به این سفر تعلق ندارد.",
  INVALID_EXECUTION_STATUS: "وضعیت اجرای سفر معتبر نیست.",
  INVALID_EXECUTION_TRANSITION:
    "این تغییر وضعیت اجرا مجاز نیست؛ بازگشت به عقب یا لغو پس از شروع ممکن نیست.",
  INVALID_EXECUTION_PERIOD:
    "زمان پیاده‌شدن واقعی نمی‌تواند پیش از زمان سوارشدن باشد.",
  INVALID_ODOMETER:
    "کیلومتر باید عدد نامنفی با حداکثر ۱۶ رقم صحیح و ۲ رقم اعشار باشد.",
  ODOMETER_DECREASE: "کیلومتر پایان نباید کمتر از کیلومتر شروع باشد.",
  INVALID_RATING: "امتیاز باید عدد صحیح معتبر باشد.",
  INVALID_FORM: "اطلاعات فرم قابل پردازش نیست.",
  UNEXPECTED: "ثبت انجام نشد. دوباره تلاش کنید.",
};
