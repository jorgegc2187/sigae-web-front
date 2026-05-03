export type ListSortDirection = 'asc' | 'desc';

export interface ListQueryState<TStatus extends string = string> {
  search: string;
  page: number;
  pageSize: number;
  status?: TStatus;
  sort?: string;
  direction?: ListSortDirection;
}
