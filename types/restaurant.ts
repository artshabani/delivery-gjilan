export interface Restaurant {
  id: number;
  name: string;
  image_url: string | null;
  description: string | null;
  delivery_time: string | null;
  is_open: boolean;
}
