export interface Category {
  id: number;
  parent_id: number;
  name: string;
  icon_url: string | null;
  sort_order: number;
}
