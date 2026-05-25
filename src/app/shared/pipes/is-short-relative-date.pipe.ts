import { Pipe, PipeTransform } from '@angular/core';
import { isShortRelativeDate } from './relative-date.utils';

@Pipe({
  name: 'isShortRelativeDate',
})
export class IsShortRelativeDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): boolean {
    return isShortRelativeDate(value);
  }
}
