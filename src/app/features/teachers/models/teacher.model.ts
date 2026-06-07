export type TeacherApiStatus = 'ACTIVE' | 'INACTIVE';
export type TeacherUiStatus = 'Activo' | 'Inactivo';
export type TeacherResponseStatus = TeacherApiStatus | TeacherUiStatus;

export interface Teacher {
  id: string;
  name: string;
  initials: string;
  dni: string;
  specialty: string;
  email: string | null;
  phone: string | null;
  status: TeacherUiStatus;
}

export interface TeacherResponse {
  id: string;
  dni: string;
  fullName: string;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  status: TeacherResponseStatus;
}

export interface TeacherRequest {
  dni: string;
  fullName: string;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  status: TeacherApiStatus;
}

export interface UpdateTeacherStatusRequest {
  status: TeacherApiStatus;
}
