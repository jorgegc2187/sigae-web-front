export interface Supplier {
  id: string;
  name: string;
  ruc?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'Activo' | 'Inactivo';
  assetsCount: number;
}

export interface SupplierResponse {
  id: string;
  name: string;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SupplierRequest {
  name: string;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}
