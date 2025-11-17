"use client";

import { CartProvider } from "@/context/CartContext";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
