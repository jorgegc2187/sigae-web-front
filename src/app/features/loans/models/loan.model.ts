export type LoanStatus = 'Activo' | 'Vencido' | 'Devuelto';
export type LoanStatusTab = 'all' | 'active' | 'overdue' | 'returned';
export type LoanAssetStatus = 'Operativo' | 'Regular' | 'En préstamo';

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

export interface Loan {
  id: string;
  code: string;
  teacher: LoanTeacher;
  assets: LoanAsset[];
  destination: string;
  loanDate: string;
  dueDate: string;
  completedDate?: string;
  status: LoanStatus;
  notes?: string;
  activities: LoanActivity[];
}
