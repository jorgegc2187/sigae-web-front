import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

type ScannerState = 'requesting' | 'scanning' | 'error';

@Component({
  selector: 'app-qr-code-scanner',
  templateUrl: './qr-code-scanner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeScannerComponent implements AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly scanDetected = output<string>();
  readonly videoElement = viewChild.required<ElementRef<HTMLVideoElement>>('videoElement');

  readonly scannerState = signal<ScannerState>('requesting');
  readonly errorMessage = signal<string | null>(null);

  private readonly codeReader = new BrowserQRCodeReader();
  private scannerControls: IScannerControls | null = null;
  private hasCompleted = false;

  ngAfterViewInit() {
    void this.startScanner();
  }

  ngOnDestroy() {
    this.stopScanner();
  }

  private async startScanner() {
    if (!this.isCameraSupported()) {
      this.setError(
        'La cámara no está disponible en este navegador. Use HTTPS desde móvil o continúe con el ingreso manual del código.',
      );
      return;
    }

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    try {
      this.scannerState.set('requesting');
      this.errorMessage.set(null);

      const controls = await this.codeReader.decodeFromConstraints(
        constraints,
        this.videoElement().nativeElement,
        (result) => {
          if (!result || this.hasCompleted) {
            return;
          }

          this.hasCompleted = true;
          controls.stop();
          this.scannerControls = null;

          this.ngZone.run(() => {
            this.scanDetected.emit(result.getText().trim());
          });
        },
      );

      this.scannerControls = controls;
      this.scannerState.set('scanning');
      this.destroyRef.onDestroy(() => this.stopScanner());
    } catch (error) {
      this.setError(this.mapScannerError(error));
    }
  }

  private stopScanner() {
    this.hasCompleted = true;
    this.scannerControls?.stop();
    this.scannerControls = null;
  }

  private isCameraSupported(): boolean {
    return !!globalThis.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
  }

  private setError(message: string) {
    this.scannerState.set('error');
    this.errorMessage.set(message);
  }

  private mapScannerError(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        return 'No se concedió permiso para usar la cámara.';
      }

      if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
        return 'No se encontró una cámara trasera disponible en este dispositivo.';
      }

      if (error.name === 'NotReadableError') {
        return 'La cámara está siendo usada por otra aplicación o no pudo iniciarse.';
      }
    }

    return 'No se pudo iniciar el escáner QR. Verifique permisos y que la aplicación se abra por HTTPS.';
  }
}
