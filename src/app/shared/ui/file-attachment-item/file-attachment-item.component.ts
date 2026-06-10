import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { resolveFileAttachmentMetadata } from '../../utils/file-attachment.util';

export type FileAttachmentItemLayout = 'compact' | 'detailed';

@Component({
  selector: 'app-file-attachment-item',
  templateUrl: './file-attachment-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block h-full',
  },
})
export class FileAttachmentItemComponent {
  readonly fileName = input.required<string>();
  readonly mimeType = input.required<string>();
  readonly sizeBytes = input.required<number>();
  readonly previewable = input(false, { transform: booleanAttribute });
  readonly layout = input<FileAttachmentItemLayout>('compact');
  readonly showTypeBadge = input(false, { transform: booleanAttribute });
  readonly showActionsOnHover = input(true, { transform: booleanAttribute });
  readonly removable = input(false, { transform: booleanAttribute });

  readonly previewRequested = output<void>();
  readonly downloadRequested = output<void>();
  readonly removeRequested = output<void>();

  readonly metadata = computed(() =>
    resolveFileAttachmentMetadata(this.fileName(), this.mimeType(), this.sizeBytes()),
  );

  readonly articleClass = computed(() =>
    this.layout() === 'detailed'
      ? 'group flex h-full flex-col justify-between gap-4 rounded-xl border border-base-300 bg-base-100 p-4 transition-colors hover:bg-base-200/35'
      : 'group flex h-full items-center gap-3 rounded-xl border border-base-300 bg-base-100 p-3 transition-colors hover:bg-base-200/35',
  );

  readonly iconShellClass = computed(() =>
    this.layout() === 'detailed'
      ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'
      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
  );

  readonly iconClass = computed(() =>
    this.layout() === 'detailed' ? 'material-symbols-outlined text-[24px]' : 'material-symbols-outlined text-[22px]',
  );

  readonly actionContainerClass = computed(() => {
    if (!this.showActionsOnHover()) {
      return 'flex shrink-0 items-center gap-1';
    }

    return 'flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100';
  });

  onPreviewRequested(): void {
    if (!this.previewable()) {
      return;
    }

    this.previewRequested.emit();
  }

  onDownloadRequested(): void {
    this.downloadRequested.emit();
  }

  onRemoveRequested(): void {
    if (!this.removable()) {
      return;
    }

    this.removeRequested.emit();
  }
}
