import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ActionButtonComponent } from '../action-button/action-button.component';

export type ConfirmationModalTone = 'neutral' | 'info' | 'warning' | 'danger';

@Component({
  selector: 'app-confirmation-modal',
  imports: [ActionButtonComponent],
  templateUrl: './confirmation-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly message = input('');
  readonly tone = input<ConfirmationModalTone>('warning');
  readonly icon = input<string | null>(null);
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly confirmIcon = input<string | null>(null);
  readonly loading = input(false);
  readonly loadingLabel = input<string | null>(null);
  readonly disableConfirm = input(false);
  readonly closeOnBackdrop = input(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly closed = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  readonly resolvedIcon = computed(() => {
    if (this.icon()) {
      return this.icon();
    }

    const icons: Record<ConfirmationModalTone, string> = {
      neutral: 'help',
      info: 'info',
      warning: 'warning',
      danger: 'error',
    };
    return icons[this.tone()];
  });

  readonly iconClass = computed(() => {
    const tones: Record<ConfirmationModalTone, string> = {
      neutral: 'bg-base-200 text-base-content/70',
      info: 'bg-info/10 text-info',
      warning: 'bg-warning/10 text-warning',
      danger: 'bg-error/10 text-error',
    };
    return `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[this.tone()]}`;
  });

  readonly confirmClass = computed(() => {
    if (this.tone() === 'danger') {
      return '!border-error !bg-error !text-error-content hover:!bg-error/90';
    }

    if (this.tone() === 'warning') {
      return '!border-warning !bg-warning !text-warning-content hover:!bg-warning/90';
    }

    return '';
  });

  readonly confirmVariant = computed(() =>
    this.tone() === 'danger' || this.tone() === 'warning' ? 'neutral' : 'primary',
  );

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) {
        return;
      }

      if (this.open() && !dialog.open) {
        dialog.showModal();
        return;
      }

      if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  onConfirm(): void {
    if (this.loading() || this.disableConfirm()) {
      return;
    }

    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.loading()) {
      return;
    }

    this.cancelled.emit();
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (!this.closeOnBackdrop()) {
      return;
    }

    this.onCancel();
  }

  onNativeCancel(event: Event): void {
    event.preventDefault();
    this.onCancel();
  }
}
