export interface Product {
  id: number;
  name: string;
  price: number;
  image_url: string | null;

  // NEW OPTIONALS:
  restaurant_id?: number;
  notes?: string;
  modifiers?: Record<string, boolean>;
  type?: "grocery" | "restaurant";
}
