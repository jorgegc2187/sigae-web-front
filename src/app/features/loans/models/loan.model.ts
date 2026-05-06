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

export const MOCK_LOANS: Loan[] = [
  {
    id: 'loan-001',
    code: 'PR-2024-001',
    teacher: {
      name: 'Carlos Mendoza Ruiz',
      initials: 'CM',
      specialty: 'Laboratorio',
      dni: '45892103',
    },
    assets: [
      {
        id: 'asset-001',
        code: 'MIC-0012',
        name: 'Microscopio Óptico Binocular',
        category: 'Equipos de Laboratorio',
        status: 'Operativo',
      },
      {
        id: 'asset-002',
        code: 'MIC-0015',
        name: 'Microscopio Óptico Binocular',
        category: 'Equipos de Laboratorio',
        status: 'Regular',
      },
      {
        id: 'asset-003',
        code: 'PROY-004',
        name: 'Proyector Multimedia Epson',
        category: 'Equipos Audiovisuales',
        status: 'Operativo',
      },
    ],
    destination: 'Laboratorio de Biología (Pab. B)',
    loanDate: '2024-05-15T08:30:00Z',
    dueDate: '2024-05-22T18:00:00Z',
    status: 'Activo',
    notes:
      'Préstamo autorizado para la semana de prácticas intensivas. El docente asume la responsabilidad del traslado de los equipos.',
    activities: [
      {
        id: 'activity-001',
        title: 'Préstamo registrado',
        description: 'Registrado por Admin Principal (Sistema)',
        actor: 'Admin Principal',
        timestamp: '2024-05-15T08:30:00Z',
      },
      {
        id: 'activity-002',
        title: 'Activos retirados de inventario',
        description: 'Los 3 activos fueron escaneados y marcados como "En Préstamo".',
        actor: 'Admin Principal',
        timestamp: '2024-05-15T08:45:00Z',
      },
    ],
  },
  {
    id: 'loan-002',
    code: 'PR-2024-002',
    teacher: {
      name: 'Juan Carlos Ramírez',
      initials: 'JR',
      specialty: 'Ciencias',
      dni: '70124568',
    },
    assets: [
      {
        id: 'asset-004',
        code: 'PROY-014',
        name: 'Proyector Epson',
        category: 'Equipos Audiovisuales',
        status: 'Regular',
      },
      {
        id: 'asset-005',
        code: 'CABL-098',
        name: 'Cable HDMI Belkin',
        category: 'Accesorios',
        status: 'Operativo',
      },
      {
        id: 'asset-006',
        code: 'CTRL-099',
        name: 'Control remoto Epson',
        category: 'Accesorios',
        status: 'Operativo',
      },
    ],
    destination: 'Biblioteca',
    loanDate: '2024-04-01T09:00:00Z',
    dueDate: '2024-04-30T17:30:00Z',
    status: 'Vencido',
    notes: 'Pendiente de coordinación para devolución y revisión del proyector.',
    activities: [
      {
        id: 'activity-003',
        title: 'Préstamo registrado',
        description: 'Préstamo emitido para actividades de feria científica.',
        actor: 'Admin Principal',
        timestamp: '2024-04-01T09:00:00Z',
      },
      {
        id: 'activity-004',
        title: 'Alerta de vencimiento',
        description: 'El préstamo superó la fecha límite y requiere seguimiento.',
        actor: 'Sistema',
        timestamp: '2024-05-01T08:00:00Z',
      },
    ],
  },
  {
    id: 'loan-003',
    code: 'PR-2024-003',
    teacher: {
      name: 'Laura Castillo',
      initials: 'LC',
      specialty: 'Historia',
      dni: '46587912',
    },
    assets: [
      {
        id: 'asset-007',
        code: 'TAB-033',
        name: 'Tablet Samsung Galaxy',
        category: 'Equipos Tecnológicos',
        status: 'Operativo',
      },
    ],
    destination: 'Dirección',
    loanDate: '2024-03-15T10:15:00Z',
    dueDate: '2024-03-22T17:00:00Z',
    completedDate: '2024-03-21T15:20:00Z',
    status: 'Devuelto',
    notes: '',
    activities: [
      {
        id: 'activity-005',
        title: 'Préstamo registrado',
        description: 'Entrega validada por Dirección.',
        actor: 'Admin Principal',
        timestamp: '2024-03-15T10:15:00Z',
      },
      {
        id: 'activity-006',
        title: 'Préstamo finalizado',
        description: 'Devolución registrada sin observaciones.',
        actor: 'Admin Principal',
        timestamp: '2024-03-21T15:20:00Z',
      },
    ],
  },
  {
    id: 'loan-004',
    code: 'PR-2024-004',
    teacher: {
      name: 'Ana Torres',
      initials: 'AT',
      specialty: 'Comunicación',
      dni: '21436587',
    },
    assets: [
      {
        id: 'asset-008',
        code: 'PARL-051',
        name: 'Parlante portátil JBL',
        category: 'Equipos Audiovisuales',
        status: 'Operativo',
      },
      {
        id: 'asset-009',
        code: 'MICR-052',
        name: 'Micrófono inalámbrico Shure',
        category: 'Audio',
        status: 'Operativo',
      },
    ],
    destination: 'Sala de Profesores',
    loanDate: '2024-05-20T11:00:00Z',
    dueDate: '2024-05-24T17:00:00Z',
    status: 'Activo',
    notes: 'Uso temporal para actividades del Día del Idioma.',
    activities: [
      {
        id: 'activity-007',
        title: 'Préstamo registrado',
        description: 'Asignación aprobada para evento institucional.',
        actor: 'Admin Principal',
        timestamp: '2024-05-20T11:00:00Z',
      },
    ],
  },
  {
    id: 'loan-005',
    code: 'PR-2024-005',
    teacher: {
      name: 'Pedro Vargas',
      initials: 'PV',
      specialty: 'Educación Física',
      dni: '12345678',
    },
    assets: [
      {
        id: 'asset-010',
        code: 'CRON-071',
        name: 'Cronómetro digital',
        category: 'Equipos Deportivos',
        status: 'Regular',
      },
    ],
    destination: 'Aula 1A',
    loanDate: '2024-04-02T08:00:00Z',
    dueDate: '2024-04-18T16:30:00Z',
    status: 'Vencido',
    notes: '',
    activities: [
      {
        id: 'activity-008',
        title: 'Préstamo registrado',
        description: 'Asignado para torneo interno.',
        actor: 'Admin Principal',
        timestamp: '2024-04-02T08:00:00Z',
      },
    ],
  },
  {
    id: 'loan-006',
    code: 'PR-2024-006',
    teacher: {
      name: 'Elena Soto',
      initials: 'ES',
      specialty: 'Arte y Cultura',
      dni: '87654321',
    },
    assets: [
      {
        id: 'asset-011',
        code: 'CAM-081',
        name: 'Cámara Canon EOS',
        category: 'Equipos Audiovisuales',
        status: 'Operativo',
      },
      {
        id: 'asset-012',
        code: 'TRI-082',
        name: 'Trípode Manfrotto compacto',
        category: 'Accesorios',
        status: 'Operativo',
      },
    ],
    destination: 'Laboratorio de Ciencias',
    loanDate: '2024-03-10T09:45:00Z',
    dueDate: '2024-03-18T17:00:00Z',
    completedDate: '2024-03-18T14:10:00Z',
    status: 'Devuelto',
    notes: 'La devolución se registró sin observaciones.',
    activities: [
      {
        id: 'activity-009',
        title: 'Préstamo registrado',
        description: 'Entrega validada para taller de fotografía.',
        actor: 'Admin Principal',
        timestamp: '2024-03-10T09:45:00Z',
      },
      {
        id: 'activity-010',
        title: 'Préstamo finalizado',
        description: 'Todos los activos fueron devueltos en buen estado.',
        actor: 'Admin Principal',
        timestamp: '2024-03-18T14:10:00Z',
      },
    ],
  },
  {
    id: 'loan-007',
    code: 'PR-2024-007',
    teacher: {
      name: 'Ricardo Medina',
      initials: 'RM',
      specialty: 'Biología',
      dni: '09876543',
    },
    assets: [
      {
        id: 'asset-013',
        code: 'MIC-103',
        name: 'Microscopio escolar',
        category: 'Equipos de Laboratorio',
        status: 'Operativo',
      },
    ],
    destination: 'Laboratorio de Ciencias',
    loanDate: '2024-05-03T08:20:00Z',
    dueDate: '2024-05-28T18:00:00Z',
    status: 'Activo',
    notes: '',
    activities: [
      {
        id: 'activity-011',
        title: 'Préstamo registrado',
        description: 'Asignado para sesiones demostrativas.',
        actor: 'Admin Principal',
        timestamp: '2024-05-03T08:20:00Z',
      },
    ],
  },
  {
    id: 'loan-008',
    code: 'PR-2024-008',
    teacher: {
      name: 'Sofía Quispe',
      initials: 'SQ',
      specialty: 'Tutoría',
      dni: '56781234',
    },
    assets: [
      {
        id: 'asset-014',
        code: 'LAP-121',
        name: 'Laptop Lenovo ThinkPad',
        category: 'Equipos Tecnológicos',
        status: 'Operativo',
      },
      {
        id: 'asset-015',
        code: 'MOU-122',
        name: 'Mouse inalámbrico HP',
        category: 'Accesorios',
        status: 'Operativo',
      },
      {
        id: 'asset-016',
        code: 'USB-123',
        name: 'Adaptador USB-C',
        category: 'Accesorios',
        status: 'Operativo',
      },
      {
        id: 'asset-017',
        code: 'MAL-124',
        name: 'Maletín acolchado',
        category: 'Accesorios',
        status: 'Operativo',
      },
    ],
    destination: 'Dirección',
    loanDate: '2024-04-17T09:00:00Z',
    dueDate: '2024-04-24T17:30:00Z',
    status: 'Vencido',
    notes: 'La docente solicitó ampliación verbal, pero no se registró renovación formal.',
    activities: [
      {
        id: 'activity-012',
        title: 'Préstamo registrado',
        description: 'Entrega registrada para acompañamiento tutorial.',
        actor: 'Admin Principal',
        timestamp: '2024-04-17T09:00:00Z',
      },
    ],
  },
];
