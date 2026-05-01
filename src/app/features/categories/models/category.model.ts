export interface Attribute {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
}

export interface AssetType {
  id: string;
  name: string;
  icon: string;
  attributes: Attribute[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  typesCount: number;
  assetsCount: number;
  types: AssetType[];
}

export const MOCK_CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Tecnología',
    icon: 'devices',
    typesCount: 12,
    assetsCount: 452,
    types: [
      {
        id: 't1',
        name: 'Laptop',
        icon: 'laptop_mac',
        attributes: [
          { id: 'a1', name: 'Marca', description: 'Fabricante del equipo', isRequired: true },
          { id: 'a2', name: 'Modelo', description: 'Modelo específico', isRequired: true },
          { id: 'a3', name: 'Procesador', description: 'CPU instalada', isRequired: false },
          { id: 'a4', name: 'RAM (GB)', description: 'Capacidad de memoria RAM', isRequired: false }
        ]
      },
      {
        id: 't2',
        name: 'Desktop',
        icon: 'desktop_windows',
        attributes: [
          { id: 'a5', name: 'Marca', description: 'Fabricante', isRequired: true },
          { id: 'a6', name: 'Fuente', description: 'Poder', isRequired: false }
        ]
      },
      {
        id: 't3',
        name: 'Proyector',
        icon: 'videocam',
        attributes: [
          { id: 'a7', name: 'Resolución', description: 'Resolución nativa', isRequired: true }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Mobiliario',
    icon: 'chair',
    typesCount: 8,
    assetsCount: 1204,
    types: []
  },
  {
    id: '3',
    name: 'Laboratorio',
    icon: 'science',
    typesCount: 15,
    assetsCount: 315,
    types: []
  },
  {
    id: '4',
    name: 'Deportes',
    icon: 'sports_soccer',
    typesCount: 5,
    assetsCount: 180,
    types: []
  }
];
