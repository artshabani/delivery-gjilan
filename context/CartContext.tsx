// File: src/context/CartContext.tsx

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/types/product";

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  addItem: (product: Product, qty?: number, notes?: string) => void;
  // This expects string
  decreaseItem: (productId: string) => void; 
  // This expects string
  removeItem: (productId: string) => void; 
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, qty = 1, notes = "") => {
    setItems((prev) => {
      const ex = prev.find(
        (i) =>
          i.product.id === product.id &&
          i.product.type === product.type &&
          (i.product.notes ?? "") === notes
      );

      if (ex) {
        return prev.map((i) =>
          i.product.id === ex.product.id &&
          (i.product.notes ?? "") === notes
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      }

      return [...prev, { product: { ...product, notes }, quantity: qty }];
    });
  };

  // FIX 3A: Convert i.product.id (number) to string for every comparison
  const decreaseItem = (productId: string) => {
    setItems((prev) => {
      // Find: Convert ID to string for comparison
      const target = prev.find((i) => String(i.product.id) === productId);
      if (!target) return prev;

      if (target.quantity <= 1) {
        // Filter: Convert ID to string for comparison
        return prev.filter((i) => String(i.product.id) !== productId);
      }

      return prev.map((i) =>
        // Map: Convert ID to string for comparison
        String(i.product.id) === productId
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  };

  const removeItem = (productId: string) => { 
    // FIX 3B: Convert ID to string for comparison
    setItems((prev) => prev.filter((i) => String(i.product.id) !== productId));
  };

  const clearCart = () => setItems([]);

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
const totalPrice = items.reduce((s, i) => {
  const effectivePrice =
    i.product.is_on_sale && i.product.sale_price
      ? i.product.sale_price
      : i.product.price;

  return s + effectivePrice * i.quantity;
}, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
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