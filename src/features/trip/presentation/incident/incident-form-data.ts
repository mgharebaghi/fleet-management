import type { IncidentFailure } from "../../application/incident/incident-records";

export type IncidentActionState = {
  error?: IncidentFailure | "INVALID_FORM" | "UNEXPECTED";
  values?: Record<string, string>;
};

export const incidentMessages: Record<
  NonNullable<IncidentActionState["error"]>,
  string
> = {
  INVALID_ID: "یک گزینهٔ معتبر انتخاب کنید.",
  INVALID_DATE: "تاریخ و ساعت معتبر وارد کنید.",
  REQUEST_NOT_FOUND: "درخواست سفر موجود نیست.",
  REQUEST_TERMINAL: "برای درخواست لغوشده رخداد ثبت نمی‌شود.",
  ASSIGNMENT_NOT_ON_REQUEST:
    "تخصیص انتخاب‌شده به این درخواست تعلق ندارد.",
  LOCATION_TOO_LONG: "محل حداکثر ۳۰۰ نویسه است.",
  INVALID_DAMAGE: "خسارت باید عدد نامنفی معتبر باشد.",
  INVALID_FAULT: "درصد تقصیر باید بین ۰ و ۱۰۰ باشد.",
  POLICE_REPORT_TOO_LONG: "شماره گزارش حداکثر ۱۰۰ نویسه است.",
  VIOLATION_TYPE_REQUIRED: "نوع تخلف را وارد کنید.",
  VIOLATION_TYPE_TOO_LONG: "نوع تخلف حداکثر ۱۵۰ نویسه است.",
  INVALID_AMOUNT:
    "مبلغ تخلف الزامی است؛ اگر نامشخص است این رخداد را فقط روی برگه ثبت کنید.",
  REFERENCE_TOO_LONG: "شماره پیگیری حداکثر ۱۰۰ نویسه است.",
  INVALID_FORM: "اطلاعات فرم قابل پردازش نیست.",
  UNEXPECTED: "ثبت انجام نشد. دوباره تلاش کنید.",
};
