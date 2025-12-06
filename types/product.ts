export interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string | null;

  // ADD THIS LINE ⬇️
  category_id?: number;

  // OPTIONAL FIELDS
  restaurant_id?: number;
  restaurant_name?: string;
  notes?: string;
  modifiers?: Record<string, boolean>;
  type?: "grocery" | "restaurant";
  is_on_sale?: boolean;
  sale_price?: number;
  is_restaurant_extra?: boolean;
  restaurant_price?: number;
}
