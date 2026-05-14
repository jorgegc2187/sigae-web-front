import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type SearchInputSize = 'md' | 'lg';

@Component({
  selector: 'app-search-input',
  templateUrl: './search-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchInputComponent {
  readonly value = input<string>('');
  readonly placeholder = input<string>('Buscar...');
  readonly widthClass = input<string>('w-full');
  readonly size = input<SearchInputSize>('md');
  readonly disabled = input<boolean>(false);

  readonly valueChange = output<string>();

  readonly containerClass = computed(() => {
    const sizeClass =
      this.size() === 'lg'
        ? 'h-12 rounded-xl px-4 gap-3'
        : 'h-11 rounded-lg px-3 gap-2.5';

    return `${this.widthClass()} flex items-center border border-base-300 bg-base-100 shadow-sm transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 ${sizeClass}`;
  });

  readonly iconClass = computed(() =>
    this.size() === 'lg'
      ? 'material-symbols-outlined text-[20px] text-base-content/45'
      : 'material-symbols-outlined text-[18px] text-base-content/50',
  );

  readonly inputClass = computed(() =>
    this.size() === 'lg'
      ? 'w-full border-0 bg-transparent p-0 text-base focus:outline-none placeholder-shown:opacity-50'
      : 'w-full border-0 bg-transparent p-0 text-sm focus:outline-none placeholder-shown:opacity-50',
  );

  onInput(event: Event) {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
