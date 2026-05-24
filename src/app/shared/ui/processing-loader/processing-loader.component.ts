import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ProcessingLoaderMode = 'overlay' | 'inline';

@Component({
  selector: 'app-processing-loader',
  imports: [],
  templateUrl: './processing-loader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessingLoaderComponent {
  readonly active = input(false);
  readonly title = input('Procesando solicitud...');
  readonly message = input('Por favor, espere un momento mientras procesamos la solicitud.');
  readonly mode = input<ProcessingLoaderMode>('overlay');
  readonly shellAware = input(false);
  readonly ariaLabel = input<string | null>(null);

  readonly isOverlay = computed(() => this.mode() === 'overlay');
  readonly resolvedAriaLabel = computed(() => this.ariaLabel() ?? this.title());
  readonly containerClass = computed(() => {
    if (!this.isOverlay()) {
      return 'flex w-full items-center justify-center p-4';
    }

    const shellOffset = this.shellAware() ? 'md:left-[var(--shell-sidebar-width)]' : '';
    return `fixed inset-0 z-[60] flex items-center justify-center bg-base-100/60 p-4 backdrop-blur-[2px] ${shellOffset}`.trim();
  });
}
