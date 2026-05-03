export type LoanStatus = 'Activo' | 'Vencido' | 'Devuelto';
export type LoanStatusTab = 'all' | 'active' | 'overdue' | 'returned';

export interface Loan {
  id: string;
  teacher: string;
  teacherInitials: string;
  specialty: string;
  assetsSummary: string;
  extraAssets: string[];
  location: string;
  loanDate: string;
  dueDate: string;
  status: LoanStatus;
}

export const MOCK_LOANS: Loan[] = [
  {
    id: 'loan-001',
    teacher: 'Maria Perez',
    teacherInitials: 'MP',
    specialty: 'Matemáticas',
    assetsSummary: 'Laptop HP ProBook',
    extraAssets: [],
    location: 'Aula de Cómputo',
    loanDate: '12 Oct 2023',
    dueDate: '15 Dic 2023',
    status: 'Activo',
  },
  {
    id: 'loan-002',
    teacher: 'Juan Carlos Ramirez',
    teacherInitials: 'JR',
    specialty: 'Ciencias',
    assetsSummary: 'Proyector Epson',
    extraAssets: ['Cable HDMI Belkin', 'Control remoto Epson'],
    location: 'Biblioteca',
    loanDate: '01 Sep 2023',
    dueDate: '30 Sep 2023',
    status: 'Vencido',
  },
  {
    id: 'loan-003',
    teacher: 'Laura Castillo',
    teacherInitials: 'LC',
    specialty: 'Historia',
    assetsSummary: 'Tablet Samsung Galaxy',
    extraAssets: [],
    location: 'Dirección',
    loanDate: '15 Ago 2023',
    dueDate: '15 Sep 2023',
    status: 'Devuelto',
  },
  {
    id: 'loan-004',
    teacher: 'Ana Torres',
    teacherInitials: 'AT',
    specialty: 'Comunicación',
    assetsSummary: 'Parlante portátil JBL',
    extraAssets: ['Micrófono inalámbrico Shure'],
    location: 'Sala de Profesores',
    loanDate: '20 Nov 2023',
    dueDate: '10 Dic 2023',
    status: 'Activo',
  },
  {
    id: 'loan-005',
    teacher: 'Pedro Vargas',
    teacherInitials: 'PV',
    specialty: 'Educación Física',
    assetsSummary: 'Cronómetro digital',
    extraAssets: [],
    location: 'Aula 1A',
    loanDate: '02 Oct 2023',
    dueDate: '18 Oct 2023',
    status: 'Vencido',
  },
  {
    id: 'loan-006',
    teacher: 'Elena Soto',
    teacherInitials: 'ES',
    specialty: 'Arte y Cultura',
    assetsSummary: 'Cámara Canon EOS',
    extraAssets: ['Trípode Manfrotto compacto'],
    location: 'Laboratorio de Ciencias',
    loanDate: '10 Jul 2023',
    dueDate: '01 Ago 2023',
    status: 'Devuelto',
  },
  {
    id: 'loan-007',
    teacher: 'Ricardo Medina',
    teacherInitials: 'RM',
    specialty: 'Biología',
    assetsSummary: 'Microscopio escolar',
    extraAssets: [],
    location: 'Laboratorio de Ciencias',
    loanDate: '03 Ene 2024',
    dueDate: '28 Ene 2024',
    status: 'Activo',
  },
  {
    id: 'loan-008',
    teacher: 'Sofia Quispe',
    teacherInitials: 'SQ',
    specialty: 'Tutoría',
    assetsSummary: 'Laptop Lenovo ThinkPad',
    extraAssets: ['Mouse inalámbrico HP', 'Adaptador USB-C', 'Maletín acolchado'],
    location: 'Dirección',
    loanDate: '17 Nov 2023',
    dueDate: '24 Nov 2023',
    status: 'Vencido',
  },
];
