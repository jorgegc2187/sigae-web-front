export function parseRelativeDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const shortIsoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (shortIsoDateMatch) {
    const [, yearValue, monthValue, dayValue] = shortIsoDateMatch;
    const year = Number(yearValue);
    const monthIndex = Number(monthValue) - 1;
    const day = Number(dayValue);
    const date = new Date(year, monthIndex, day);

    return date.getFullYear() === year &&
      date.getMonth() === monthIndex &&
      date.getDate() === day
      ? date
      : null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toCalendarDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function getRelativeDateDayDifference(date: Date, referenceDate: Date = new Date()): number {
  const targetDay = toCalendarDay(date);
  const todayDay = toCalendarDay(referenceDate);
  return Math.round((targetDay - todayDay) / 86_400_000);
}

export function isShortRelativeDate(value: string | Date | null | undefined): boolean {
  const date = parseRelativeDateValue(value);
  if (!date) {
    return false;
  }

  const dayDifference = getRelativeDateDayDifference(date);
  return dayDifference >= -1 && dayDifference <= 1;
}
