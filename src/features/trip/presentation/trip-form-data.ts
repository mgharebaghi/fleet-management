import type {
  TripFailure,
  TripLocationInputFailure,
} from "../application/trip-records";

export type TripActionState = {
  error?: TripFailure | "INVALID_FORM" | "UNEXPECTED";
  field?: string;
  failedLocation?: TripLocationInputFailure;
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

export function consecutiveFormIndexes(
  values: Record<string, string>,
  keyForIndex: (index: number) => string,
): number[] {
  const indexes: number[] = [];
  for (let index = 0; keyForIndex(index) in values; index += 1) {
    indexes.push(index);
  }
  return indexes;
}

export function parseOptionalInteger(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  return /^-?\d+$/.test(value.trim()) ? Number(value) : Number.NaN;
}

export function tehranDateTimeInputs(date: Date | null): {
  day: string;
  time: string;
} {
  if (!date) return { day: "", time: "" };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
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
  DRIVER_INACTIVE: "راننده غیرفعال است و قابل تخصیص نیست.",
  VEHICLE_INACTIVE: "خودرو غیرفعال است و قابل تخصیص نیست.",
  ASSIGNMENT_IMMUTABLE:
    "پس از شروع واقعی سفر، تخصیص خودرو و راننده تغییر نمی‌کند.",
  ACTIVE_EXECUTION_EXISTS:
    "برای این مسافر یک برنامه یا اجرای ناتمام وجود دارد.",
  EXECUTION_STATE_DATA: "اطلاعات واقعی با وضعیت انتخاب‌شده هم‌خوان نیست.",
  MISSING_ACTUAL_PICKUP: "تاریخ و ساعت واقعی سوارشدن مسافر را وارد کنید.",
  MISSING_ACTUAL_DROPOFF: "تاریخ و ساعت واقعی پیاده‌شدن مسافر را وارد کنید.",
  UNEXPECTED_ACTUAL_DROPOFF:
    "تا وقتی اجرا در حال انجام است، زمان واقعی پیاده‌شدن مسافر ثبت نمی‌شود.",
  UNEXPECTED_ACTUAL_START:
    "برنامه یا اجرای لغوشده نباید زمان یا کیلومتر واقعی داشته باشد.",
  MISSING_START_ODOMETER:
    "ثبت کیلومتر پایان بدون کیلومتر شروع ممکن نیست.",
  REQUEST_TERMINAL:
    "این درخواست تکمیل یا لغو شده و دیگر قابل تغییر برنامه‌ریزی نیست.",
  PLANNING_REQUIRED:
    "ابتدا خودرو و راننده را برای همهٔ مسافران ثبت کنید.",
  EXECUTION_NOT_STARTED:
    "شروع درخواست فقط پس از ثبت زمان واقعی حرکت ممکن است.",
  EXECUTIONS_INCOMPLETE:
    "تکمیل درخواست فقط وقتی ممکن است که اجرای همهٔ مسافران تکمیل شده باشد.",
  SURVEY_NOT_ALLOWED: "نظرسنجی فقط پس از تکمیل اجرا ثبت می‌شود.",
  ROUTE_OWNER_CONFLICT: "مسیر نمی‌تواند همزمان به برنامه و اجرای واقعی وصل باشد.",
  ROUTE_NOT_FOUND: "مسیر مورد نظر یافت نشد.",
  ROUTE_IN_USE: "امکان حذف یا تغییر مسیر متصل به سابقهٔ اجرای سفر وجود ندارد.",
  PASSENGER_IN_USE: "امکان حذف یا تغییر مسافر دارای سابقهٔ اجرای سفر وجود ندارد.",
  EXECUTION_NOT_FOUND:
    "سابقهٔ اجرای این سفر موجود نیست یا به این مسافر تعلق ندارد.",
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

export const assignmentIneligibilityMessages: Record<
  | "INACTIVE_DRIVER"
  | "INACTIVE_VEHICLE"
  | "INACTIVE_TIME_RANGE"
  | "INVALID_LICENSE",
  string
> = {
  INACTIVE_DRIVER: "راننده غیرفعال است",
  INACTIVE_VEHICLE: "خودرو غیرفعال است",
  INACTIVE_TIME_RANGE: "بازهٔ تخصیص در زمان این سفر فعال نیست",
  INVALID_LICENSE: "گواهینامه در روز سفر معتبر نیست",
};

export const tripErrorFields: Partial<
  Record<TripFailure | "INVALID_FORM" | "UNEXPECTED", string>
> = {
  PURPOSE_TOO_LONG: "purpose",
  INVALID_DATE: "requestedTravelDay",
  REQUEST_TYPE_NOT_FOUND: "tripRequestTypeId",
  PERSON_NOT_FOUND: "passenger.0.personId",
  PERSON_INACTIVE: "passenger.0.personId",
  LOCATION_NOT_FOUND: "passenger.0.originLocationId",
  LOCATION_INACTIVE: "passenger.0.originLocationId",
  COMMON_ORIGIN_REQUIRED: "commonOriginLocationId",
  COMMON_DESTINATION_REQUIRED: "commonDestinationLocationId",
  INVALID_ORDER: "passenger.0.pickupOrder",
  ROUTE_NAME_REQUIRED: "routeName",
  ROUTE_NAME_TOO_LONG: "routeName",
  INVALID_DISTANCE: "distanceKm",
  INVALID_DURATION: "estimatedDurationMinute",
  INVALID_SEQUENCE: "point.0.sequenceNo",
  ASSIGNMENT_NOT_FOUND: "assignmentId",
  ASSIGNMENT_NOT_ACTIVE: "assignmentId",
  NO_ELIGIBLE_LICENSE: "assignmentId",
  DRIVER_INACTIVE: "assignmentId",
  VEHICLE_INACTIVE: "assignmentId",
  MISSING_ACTUAL_PICKUP: "actualPickupDay",
  MISSING_ACTUAL_DROPOFF: "actualDropoffDay",
  UNEXPECTED_ACTUAL_DROPOFF: "actualDropoffDay",
  UNEXPECTED_ACTUAL_START: "actualPickupDay",
  INVALID_EXECUTION_PERIOD: "actualDropoffDay",
  INVALID_ODOMETER: "startOdometer",
  ODOMETER_DECREASE: "endOdometer",
  MISSING_START_ODOMETER: "startOdometer",
};
