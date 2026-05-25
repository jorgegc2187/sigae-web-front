export function parseRelativeDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getRelativeDateDayDifference(date: Date, referenceDate: Date = new Date()): number {
  const targetDay = toUtcDay(date);
  const todayDay = toUtcDay(referenceDate);
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
