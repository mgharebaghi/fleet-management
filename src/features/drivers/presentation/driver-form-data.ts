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
export { parseGregorianDay as parseDate, parseTehranDateTime as parseDateTime } from "../../../shared/presentation/tehran-date-time";

export const driverMessages: Record<DriverFailure | "INVALID_FORM" | "UNEXPECTED", string> = {
  ASSIGNMENT_IN_USE: "این تخصیص در سفر استفاده شده است؛ خودرو و بازهٔ زمانی آن قابل ویرایش نیست.",
  INVALID_ID: "گزینهٔ معتبر انتخاب کنید.", PERSON_NOT_FOUND: "شخص انتخاب‌شده موجود نیست.", PERSON_INACTIVE: "شخص غیرفعال است؛ تعریف راننده یا تخصیص جدید مجاز نیست.", DRIVER_EXISTS: "برای این شخص قبلاً راننده تعریف شده است.", DRIVER_NOT_FOUND: "راننده موجود نیست.", LICENSE_NOT_FOUND: "گواهینامه موجود نیست یا به این راننده تعلق ندارد.",
  LICENSE_TYPE_REQUIRED: "نوع گواهینامه را وارد کنید.", LICENSE_TYPE_TOO_LONG: "نوع گواهینامه حداکثر ۱۰۰ نویسه است.", LICENSE_NO_REQUIRED: "شمارهٔ گواهینامه را وارد کنید.", LICENSE_NO_TOO_LONG: "شمارهٔ گواهینامه حداکثر ۵۰ نویسه است.", LICENSE_EXISTS: "این شمارهٔ گواهینامه قبلاً ثبت شده است.", INVALID_DATE: "تاریخ و ساعت معتبر وارد کنید.", ISSUE_IN_FUTURE: "تاریخ صدور نمی‌تواند در آینده باشد.", EXPIRY_BEFORE_ISSUE: "انقضا نمی‌تواند قبل از صدور باشد.",
  VEHICLE_NOT_FOUND: "خودرو موجود نیست.", VEHICLE_INACTIVE: "خودرو غیرفعال است و قابل تخصیص نیست.", VEHICLE_CURRENTLY_ASSIGNED: "این خودرو در حال حاضر به رانندهٔ دیگری تخصیص دارد و در دسترس نیست.", NO_ELIGIBLE_LICENSE: "راننده در روز شروع تخصیص، گواهینامهٔ فعال و معتبر ندارد.", INVALID_PERIOD: "زمان پایان باید بعد از زمان شروع باشد.", INVALID_ODOMETER: "کیلومتر باید عدد نامنفی با حداکثر ۱۶ رقم صحیح و ۲ رقم اعشار باشد.", ODOMETER_DECREASE: "کیلومتر پایان نباید کمتر از کیلومتر شروع باشد.", DESCRIPTION_TOO_LONG: "توضیحات حداکثر ۵۰۰ نویسه است.", DRIVER_OVERLAP: "راننده در این بازه تخصیص دیگری دارد؛ ابتدا بازهٔ قبلی را بررسی و در صورت نیاز ببندید.", VEHICLE_OVERLAP: "خودرو در این بازه به رانندهٔ دیگری تخصیص دارد.", ASSIGNMENT_NOT_FOUND: "تخصیص موجود نیست.", ASSIGNMENT_CLOSED: "این تخصیص قبلاً بسته شده است.", ASSIGNMENT_NOT_DELETABLE: "تخصیص‌های پایان‌یافته قابل حذف نیستند.", ASSIGNMENT_IMMUTABLE: "این تخصیص پایان‌یافته و غیرقابل ویرایش است.", INVALID_FORM: "اطلاعات فرم قابل پردازش نیست.", UNEXPECTED: "ثبت انجام نشد. دوباره تلاش کنید.",
};
