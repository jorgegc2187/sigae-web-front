export type LoanAttachmentSource = 'picker' | 'camera' | 'gallery' | 'files';

export type LoanAttachmentStatus = 'ready';

export interface LoanAttachmentDraft {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  previewUrl?: string;
  source: LoanAttachmentSource;
  status: LoanAttachmentStatus;
}
