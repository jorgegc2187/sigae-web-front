import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { ActionButtonComponent } from '../../../../shared/ui/action-button/action-button.component';
import { SelectFieldComponent, SelectFieldOption } from '../../../../shared/ui/select-field/select-field.component';
import { LoanDetail, LoanReturnCondition, LoanReturnPayload } from '../../models/loan.model';

interface AssetReturnReviewState {
  hasIncident: boolean;
  incidentDescription: string;
  conditionAfterReturn: LoanReturnCondition;
}

@Component({
  selector: 'app-loan-return-modal',
  imports: [ActionButtonComponent, SelectFieldComponent],
  templateUrl: './loan-return-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanReturnModalComponent {
  readonly open = input(false);
  readonly loan = input<LoanDetail | null>(null);
  readonly loading = input(false);

  readonly confirmed = output<LoanReturnPayload>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly reviews = signal<Record<string, AssetReturnReviewState>>({});
  private readonly initializedLoanId = signal<string | null>(null);

  readonly conditionOptions: SelectFieldOption[] = [
    { value: 'Bueno', label: 'Bueno' },
    { value: 'Regular', label: 'Regular' },
    { value: 'Malo', label: 'Malo' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Dado de baja', label: 'Dado de baja' },
  ];

  readonly hasValidationErrors = computed(() => {
    const loan = this.loan();
    if (!loan) {
      return true;
    }

    const reviews = this.reviews();
    return loan.assets.some((asset) => {
      const review = reviews[asset.id];
      return review?.hasIncident && (!review.incidentDescription.trim() || !review.conditionAfterReturn);
    });
  });

  readonly incidentCount = computed(() => {
    const reviews = this.reviews();
    return Object.values(reviews).filter((review) => review.hasIncident).length;
  });

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

    effect(() => {
      const loan = this.loan();
      if (!loan || this.initializedLoanId() === loan.id) {
        return;
      }

      this.initializedLoanId.set(loan.id);
      this.reviews.set(
        Object.fromEntries(
          loan.assets.map((asset) => [
            asset.id,
            {
              hasIncident: false,
              incidentDescription: '',
              conditionAfterReturn: 'Malo' as LoanReturnCondition,
            },
          ]),
        ),
      );
    });
  }

  reviewFor(assetId: string): AssetReturnReviewState {
    return this.reviews()[assetId] ?? {
      hasIncident: false,
      incidentDescription: '',
      conditionAfterReturn: 'Malo',
    };
  }

  toggleIncident(assetId: string, hasIncident: boolean): void {
    this.reviews.update((reviews) => ({
      ...reviews,
      [assetId]: {
        ...this.reviewFor(assetId),
        hasIncident,
      },
    }));
  }

  updateDescription(assetId: string, value: string): void {
    this.reviews.update((reviews) => ({
      ...reviews,
      [assetId]: {
        ...this.reviewFor(assetId),
        incidentDescription: value,
      },
    }));
  }

  updateCondition(assetId: string, value: string): void {
    this.reviews.update((reviews) => ({
      ...reviews,
      [assetId]: {
        ...this.reviewFor(assetId),
        conditionAfterReturn: value as LoanReturnCondition,
      },
    }));
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog()?.nativeElement) {
      this.onCancel();
    }
  }

  onCancel(): void {
    if (this.loading()) {
      return;
    }

    this.cancelled.emit();
  }

  onConfirm(): void {
    const loan = this.loan();
    if (!loan || this.loading() || this.hasValidationErrors()) {
      return;
    }

    const reviews = this.reviews();
    this.confirmed.emit({
      assetReviews: loan.assets.map((asset) => {
        const review = reviews[asset.id] ?? this.reviewFor(asset.id);
        return {
          assetId: asset.id,
          hasIncident: review.hasIncident,
          incidentDescription: review.hasIncident ? review.incidentDescription.trim() : null,
          conditionAfterReturn: review.hasIncident ? review.conditionAfterReturn : null,
        };
      }),
    });
  }
}
