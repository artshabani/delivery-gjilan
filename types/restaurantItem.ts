export interface RestaurantItem {
  id: number;
  restaurant_id: number;
  category_id: number | null;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
}
