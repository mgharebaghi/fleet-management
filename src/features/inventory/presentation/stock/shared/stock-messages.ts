export const stockTypeLabels: Record<string, string> = { Opening: "موجودی اولیه", Receipt: "ورود", Issue: "خروج", Return: "برگشت مصرف‌نشده", AdjustmentIn: "اصلاح افزایشی", AdjustmentOut: "اصلاح کاهشی" };
export const stockFailureMessages: Record<string, string> = {
  REFERENCE_UNAVAILABLE: "قطعه یا انبار انتخاب‌شده موجود یا فعال نیست.", OPENING_EXISTS: "برای این قطعه در این انبار قبلاً گردش ثبت شده است؛ موجودی اولیه دوباره قابل ثبت نیست.",
  INSUFFICIENT_STOCK: "موجودی این قطعه در انبار انتخاب‌شده کافی نیست.", INVALID_LEDGER: "موجودی این قطعه به دلیل گردش نامعتبر قابل محاسبه نیست. ابتدا سوابق را بررسی کنید.",
};
export const stockDateFormatter = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" });
