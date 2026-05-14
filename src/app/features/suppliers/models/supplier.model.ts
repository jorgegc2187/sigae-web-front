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
