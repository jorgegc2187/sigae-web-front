import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  output,
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

  readonly signatureChange = output<string | null>();
  readonly signatureDataUrl = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.initializePad());
  }

  clearSignature() {
    this.signaturePad?.clear();
    this.signatureDataUrl.set(null);
    this.signatureChange.emit(null);
  }

  hasSignature(): boolean {
    return !!this.signatureDataUrl();
  }

  onWindowResize() {
    if (!this.signaturePad) {
      return;
    }

    const currentSignature = this.signatureDataUrl();
    this.resizeCanvas();

    if (currentSignature) {
      this.signaturePad.fromDataURL(currentSignature);
    }
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
  }

  private readonly handleSignatureChange = () => {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      this.signatureDataUrl.set(null);
      this.signatureChange.emit(null);
      return;
    }

    const signatureDataUrl = this.signaturePad.toDataURL('image/png');
    this.signatureDataUrl.set(signatureDataUrl);
    this.signatureChange.emit(signatureDataUrl);
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
    context?.scale(ratio, ratio);
    this.signaturePad.clear();
  }
}
