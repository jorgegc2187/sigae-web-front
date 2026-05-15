import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { QrCodeScannerComponent } from '../qr-code-scanner/qr-code-scanner.component';

@Component({
  selector: 'app-asset-qr-scanner-modal',
  imports: [QrCodeScannerComponent],
  templateUrl: './asset-qr-scanner-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetQrScannerModalComponent {
  readonly closeRequested = output<void>();
  readonly scanDetected = output<string>();

  requestClose() {
    this.closeRequested.emit();
  }

  handleScanDetected(value: string) {
    this.scanDetected.emit(value);
  }
}
