export interface Manager {
  id: string;
  name: string;
  initials: string;
  colorClass: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  managers: Manager[];
  additionalManagersCount?: number;
  managersText?: string;
}
