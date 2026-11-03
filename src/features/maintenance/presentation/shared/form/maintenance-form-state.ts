import type { ReferenceFailure } from "../../../application/reference-data/maintenance-reference-records";
export type MaintenanceFormState = { error?: ReferenceFailure; unavailable?: boolean };
export const referenceFailureMessages: Record<Exclude<ReferenceFailure["type"], "VALIDATION_ERROR">, string> = {
  TYPE_IN_USE: "این نوع تعمیر و سرویس در درخواست تعمیر، پروندهٔ تعمیر یا برنامهٔ سرویس استفاده شده و قابل حذف نیست؛ در صورت نیاز آن را غیرفعال کنید.",
  NOT_FOUND: "این مورد پیدا نشد. فهرست را به‌روزرسانی کنید.", DUPLICATE_CODE: "این کد نوع تعمیر و سرویس قبلاً ثبت شده است.",
  TYPE_CAPACITY: "ظرفیت ثبت نوع تعمیر و سرویس تکمیل است. برای بررسی با پشتیبانی تماس بگیرید.", WORKSHOP_UNAVAILABLE: "تعمیرگاه انتخاب‌شده موجود یا فعال نیست. تعمیرگاه دیگری انتخاب کنید.",
};
