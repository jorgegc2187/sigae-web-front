export type LoanStatus = 'Activo' | 'Vencido' | 'Devuelto';
export type LoanStatusTab = 'all' | 'active' | 'overdue' | 'returned';
export type LoanAssetStatus = 'Bueno' | 'Regular' | 'Malo' | 'Mantenimiento' | 'Dado de baja';
export type LoanReturnCondition = 'Bueno' | 'Regular' | 'Malo' | 'Mantenimiento' | 'Dado de baja';

export interface LoanTeacher {
  name: string;
  initials: string;
  specialty: string;
  dni: string;
}

export interface LoanAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  status: LoanAssetStatus;
}

export interface LoanActivity {
  id: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface LoanAttachmentSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  source: string;
  downloadUrl: string;
}

export interface LoanSummary {
  id: string;
  code: string;
  teacher: LoanTeacher;
  assets: LoanAsset[];
  destination: string;
  loanDate: string;
  dueDate: string;
  status: LoanStatus;
}

export interface LoanDetail extends LoanSummary {
  completedDate: string | null;
  notes?: string;
  signatureDataUrl: string | null;
  attachments: LoanAttachmentSummary[];
  activities: LoanActivity[];
}

export interface CreateLoanPayload {
  teacherId: string;
  destinationLocationId: string;
  loanDate: string;
  dueDate: string;
  notes: string | null;
  assetIds: string[];
  attachmentSources: string[];
}

export interface LoanReturnAssetReviewPayload {
  assetId: string;
  hasIncident: boolean;
  incidentDescription: string | null;
  conditionAfterReturn: LoanReturnCondition | null;
}

export interface LoanReturnPayload {
  assetReviews: LoanReturnAssetReviewPayload[];
}

export type Loan = LoanDetail;
