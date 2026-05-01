export type UserRole = 'Administrador' | 'Encargado' | 'Director';
export type UserStatus = 'Activo' | 'Inactivo';

export interface User {
  id: number;
  name: string;
  email: string;
  initials: string;
  avatarColor: string; // clase de DaisyUI/Tailwind, ej. 'bg-primary'
  role: UserRole;
  locations: string | null; // 'Acceso global' | 'Aula de Cómputo, +1 más' | null
  status: UserStatus;
  lastAccess: string; // texto relativo, ej. 'Hoy', 'Hace 1 día'
}

export const MOCK_USERS: User[] = [
  {
    id: 1,
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@colegio.edu.pe',
    initials: 'CM',
    avatarColor: 'bg-primary',
    role: 'Administrador',
    locations: null,
    status: 'Activo',
    lastAccess: 'Hoy',
  },
  {
    id: 2,
    name: 'Luis Quispe',
    email: 'luis.quispe@colegio.edu.pe',
    initials: 'LQ',
    avatarColor: 'bg-info',
    role: 'Encargado',
    locations: 'Aula de Cómputo',
    status: 'Activo',
    lastAccess: 'Hace 1 día',
  },
  {
    id: 3,
    name: 'María Huanca',
    email: 'maria.huanca@colegio.edu.pe',
    initials: 'MH',
    avatarColor: 'bg-secondary',
    role: 'Encargado',
    locations: 'Biblioteca, +1 más',
    status: 'Activo',
    lastAccess: 'Hace 3 días',
  },
  {
    id: 4,
    name: 'Jorge Ramos',
    email: 'jorge.ramos@colegio.edu.pe',
    initials: 'JR',
    avatarColor: 'bg-neutral',
    role: 'Director',
    locations: null,
    status: 'Activo',
    lastAccess: 'Hace 1 semana',
  },
  {
    id: 5,
    name: 'Ana Torres',
    email: 'ana.torres@colegio.edu.pe',
    initials: 'AT',
    avatarColor: 'bg-accent',
    role: 'Encargado',
    locations: 'Sala de Profesores',
    status: 'Inactivo',
    lastAccess: 'Hace 2 meses',
  },
  {
    id: 6,
    name: 'Rosa Ccama',
    email: 'rosa.ccama@colegio.edu.pe',
    initials: 'RC',
    avatarColor: 'bg-primary',
    role: 'Encargado',
    locations: 'Laboratorio de Ciencias',
    status: 'Activo',
    lastAccess: 'Hace 5 días',
  },
];
