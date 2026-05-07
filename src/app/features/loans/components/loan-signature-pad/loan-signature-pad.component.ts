import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-loan-signature-pad',
  standalone: true,
  templateUrl: './loan-signature-pad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onWindowResize()',
  },
})
export class LoanSignaturePadComponent implements OnDestroy {
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('signatureCanvas');
  private signaturePad: SignaturePad | null = null;

  readonly signatureDataUrl = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.initializePad());
  }

  clearSignature() {
    this.signaturePad?.clear();
    this.signatureDataUrl.set(null);
  }

  hasSignature(): boolean {
    return !!this.signatureDataUrl();
  }

  getSignatureDataUrl(): string | null {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      this.signatureDataUrl.set(null);
      return null;
    }

    const signatureDataUrl = this.signaturePad.toDataURL('image/png');
    this.signatureDataUrl.set(signatureDataUrl);
    return signatureDataUrl;
  }

  loadSignature(signatureDataUrl: string | null) {
    if (!this.signaturePad) {
      this.signatureDataUrl.set(signatureDataUrl);
      return;
    }

    this.resizeCanvas();
    this.restoreSignature(signatureDataUrl);
  }

  onWindowResize() {
    if (!this.signaturePad) {
      return;
    }

    const currentSignature = this.getSignatureDataUrl();
    this.resizeCanvas();
    this.restoreSignature(currentSignature);
  }

  ngOnDestroy() {
    this.signaturePad?.off();
  }

  private initializePad() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      return;
    }

    if (!this.signaturePad) {
      this.signaturePad = new SignaturePad(canvas, {
        minWidth: 0.8,
        maxWidth: 2.2,
        penColor: '#0F172A',
        backgroundColor: 'rgba(255,255,255,0)',
      });

      this.signaturePad.addEventListener('endStroke', this.handleSignatureChange);
    }

    this.resizeCanvas();
    this.restoreSignature(this.signatureDataUrl());
  }

  private readonly handleSignatureChange = () => {
    this.signatureDataUrl.set(this.getSignatureDataUrl());
  };

  private resizeCanvas() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas || !this.signaturePad) {
      return;
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const context = canvas.getContext('2d');
    context?.setTransform(1, 0, 0, 1, 0, 0);
    context?.scale(ratio, ratio);
    this.signaturePad.clear();
  }

  private restoreSignature(signatureDataUrl: string | null) {
    if (!this.signaturePad) {
      return;
    }

    this.signaturePad.clear();

    if (!signatureDataUrl) {
      this.signatureDataUrl.set(null);
      return;
    }

    this.signaturePad.fromDataURL(signatureDataUrl);
    this.signatureDataUrl.set(signatureDataUrl);
  }
}
