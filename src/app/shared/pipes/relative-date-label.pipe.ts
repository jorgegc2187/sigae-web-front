import { Pipe, PipeTransform } from '@angular/core';
import { getRelativeDateDayDifference, parseRelativeDateValue } from './relative-date.utils';

@Pipe({
  name: 'relativeDateLabel',
})
export class RelativeDateLabelPipe implements PipeTransform {
  private readonly fallbackFormatter = new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  transform(value: string | Date | null | undefined): string {
    const date = parseRelativeDateValue(value);
    if (!date) {
      return '';
    }
    const dayDifference = getRelativeDateDayDifference(date);

    if (dayDifference === 0) {
      return 'Hoy';
    }

    if (dayDifference === -1) {
      return 'Ayer';
    }

    if (dayDifference === 1) {
      return 'Mañana';
    }

    return this.fallbackFormatter.format(date);
  }
}
