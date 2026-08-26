export default interface HcbApiObject<T extends string> {
  id: `${T}_${string}`;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  has_more: boolean;
  total_count: number;
}
