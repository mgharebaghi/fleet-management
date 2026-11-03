export function jalaliYearOf(dateTime: Date): number {
  const yearPart = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "Asia/Tehran", year: "numeric" })
    .formatToParts(dateTime).find(part => part.type === "year")?.value;
  const year = Number(yearPart);
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error("The date has no supported Jalali year.");
  return year;
}
