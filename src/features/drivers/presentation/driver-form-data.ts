import type { DriverFailure } from "../application/driver-records";

export type DriverActionState = { error?: DriverFailure | "INVALID_FORM" | "UNEXPECTED"; values?: Record<string, string> };
export function formValues(data: FormData): Record<string, string> | null {
  const values: Record<string, string> = {};
  for (const [name, value] of data.entries()) {
    if (name.startsWith("$ACTION_")) continue;
    if (typeof value !== "string" || name in values) return null;
    values[name] = value;
  }
  return values;
}
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(NaN);
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : new Date(NaN);
}
// The picker posts a Gregorian day; the accompanying clock is explicitly Tehran time.
export function parseDateTime(day: string | undefined, time: string | undefined): Date | null {
  if (!day && !time) return null;
  const date = parseDate(day);
  if (!date || !Number.isFinite(date.getTime()) || !time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return new Date(NaN);
  const wallTime = new Date(`${day}T${time}:00Z`).getTime();
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const asWallTime = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
    return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`).getTime();
  };
  let instant = wallTime;
  // Resolve historical Tehran DST with the platform timezone database.
  for (let attempt = 0; attempt < 3; attempt++) instant += wallTime - asWallTime(instant);
  return asWallTime(instant) === wallTime ? new Date(instant) : new Date(NaN);
}
export const driverMessages: Record<DriverFailure | "INVALID_FORM" | "UNEXPECTED", string> = {
  INVALID_ID: "گزینهٔ معتبر انتخاب کنید.", PERSON_NOT_FOUND: "شخص انتخاب‌شده موجود نیست.", PERSON_INACTIVE: "شخص غیرفعال است؛ تعریف راننده یا تخصیص جدید مجاز نیست.", DRIVER_EXISTS: "برای این شخص قبلاً راننده تعریف شده است.", DRIVER_NOT_FOUND: "راننده موجود نیست.",
  LICENSE_TYPE_REQUIRED: "نوع گواهینامه را وارد کنید.", LICENSE_TYPE_TOO_LONG: "نوع گواهینامه حداکثر ۱۰۰ نویسه است.", LICENSE_NO_REQUIRED: "شمارهٔ گواهینامه را وارد کنید.", LICENSE_NO_TOO_LONG: "شمارهٔ گواهینامه حداکثر ۵۰ نویسه است.", LICENSE_EXISTS: "این شمارهٔ گواهینامه قبلاً ثبت شده است.", INVALID_DATE: "تاریخ و ساعت معتبر وارد کنید.", ISSUE_IN_FUTURE: "تاریخ صدور نمی‌تواند در آینده باشد.", EXPIRY_BEFORE_ISSUE: "انقضا نمی‌تواند قبل از صدور باشد.",
  VEHICLE_NOT_FOUND: "خودرو موجود نیست.", VEHICLE_INACTIVE: "خودرو غیرفعال است و قابل تخصیص نیست.", NO_ELIGIBLE_LICENSE: "راننده در روز شروع تخصیص، گواهینامهٔ فعال و معتبر ندارد.", INVALID_PERIOD: "زمان پایان باید بعد از زمان شروع باشد.", INVALID_ODOMETER: "کیلومتر باید عدد نامنفی با حداکثر ۱۶ رقم صحیح و ۲ رقم اعشار باشد.", ODOMETER_DECREASE: "کیلومتر پایان نباید کمتر از کیلومتر شروع باشد.", DESCRIPTION_TOO_LONG: "توضیحات حداکثر ۵۰۰ نویسه است.", DRIVER_OVERLAP: "راننده در این بازه تخصیص دیگری دارد؛ ابتدا بازهٔ قبلی را بررسی و در صورت نیاز ببندید.", VEHICLE_OVERLAP: "خودرو در این بازه به رانندهٔ دیگری تخصیص دارد.", ASSIGNMENT_NOT_FOUND: "تخصیص موجود نیست.", ASSIGNMENT_CLOSED: "این تخصیص قبلاً بسته شده است.", INVALID_FORM: "اطلاعات فرم قابل پردازش نیست.", UNEXPECTED: "ثبت انجام نشد. دوباره تلاش کنید.",
};
