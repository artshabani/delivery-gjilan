"use client";

import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  restaurantMixFee: number;
  totalPrice: number;
  addItem: (product: Product, qty?: number, notes?: string) => void;
  decreaseItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  /* -----------------------------------------------
     Load from localStorage
  ------------------------------------------------ */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cart");
      if (stored) {
        const parsed: CartItem[] = JSON.parse(stored);
        setItems(parsed);
      }
    } catch {}
  }, []);

  /* -----------------------------------------------
     Save to localStorage
  ------------------------------------------------ */
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  /* -----------------------------------------------
     Detect how many restaurants are in the cart
  ------------------------------------------------ */
  const restaurantGroups = Array.from(
    new Set(
      items
        .filter((i) => i.product.type === "restaurant")
        .map((i) => i.product.restaurant_id)
        .filter(Boolean)
    )
  );

  const numRestaurants = restaurantGroups.length;
  const restaurantMixFee = numRestaurants >= 2 ? 1 : 0;

  /* -----------------------------------------------
     ADD ITEM + Restaurant Mix Rules
  ------------------------------------------------ */
  const addItem = (product: Product, qty = 1, notes = "") => {
    const normalizedProduct: Product = {
      ...product,
      type: product.type ?? "grocery",
      restaurant_id:
        product.type === "restaurant"
          ? product.restaurant_id ?? product.id
          : undefined,
    };

    const isRestaurant = normalizedProduct.type === "restaurant";
    const restaurantId = normalizedProduct.restaurant_id;

    if (isRestaurant) {
      if (!restaurantId) {
        toast.error("Invalid restaurant item (missing restaurant_id)");
        return;
      }

      // Already have 2 different restaurants and trying to add a 3rd
      if (numRestaurants >= 2 && !restaurantGroups.includes(restaurantId)) {
        toast.error("Nuk mund të porosisni nga më shumë se 2 restorante.");
        return;
      }
    }

    // Standard add logic
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.product.id === normalizedProduct.id &&
          i.product.type === normalizedProduct.type &&
          (i.product.notes ?? "") === notes
      );

      if (existing) {
        return prev.map((i) =>
          i.product.id === existing.product.id &&
          (i.product.notes ?? "") === notes
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }

      return [
        ...prev,
        { product: { ...normalizedProduct, notes }, quantity: qty },
      ];
    });
  };

  /* -----------------------------------------------
     Decrease item
  ------------------------------------------------ */
  const decreaseItem = (productId: string) => {
    setItems((prev) => {
      const target = prev.find((i) => String(i.product.id) === productId);
      if (!target) return prev;

      if (target.quantity <= 1) {
        return prev.filter((i) => String(i.product.id) !== productId);
      }

      return prev.map((i) =>
        String(i.product.id) === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  };

  /* -----------------------------------------------
     Remove item
  ------------------------------------------------ */
  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => String(i.product.id) !== productId));
  };

  const clearCart = () => setItems([]);

  /* -----------------------------------------------
     Subtotal (without fee)
  ------------------------------------------------ */
  const subtotal = items.reduce((sum, i) => {
    const price =
      i.product.is_on_sale && i.product.sale_price
        ? i.product.sale_price
        : i.product.price;

    return sum + price * i.quantity;
  }, 0);

  /* -----------------------------------------------
     Total quantity
  ------------------------------------------------ */
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  /* -----------------------------------------------
     Final price with restaurant mix fee
  ------------------------------------------------ */
  const totalPrice = subtotal + restaurantMixFee;

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        subtotal,
        restaurantMixFee,
        totalPrice,
        addItem,
        decreaseItem,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
