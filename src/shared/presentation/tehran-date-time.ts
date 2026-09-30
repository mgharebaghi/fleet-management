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

export function parseGregorianDay(value: string | undefined): Date | null {
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
  const date = parseGregorianDay(day);
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
