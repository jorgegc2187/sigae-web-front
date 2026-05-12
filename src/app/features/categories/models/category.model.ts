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
