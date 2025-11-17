import "./globals.css";
import { ReactNode } from "react";
import { ClientProviders } from "./ClientProviders";
import { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import CartOverlay from "@/components/cart/CartOverlay";

export const metadata = {
  title: "PrePhase0",
  description: "Delivery Gjilan Pre-Phase 0",
};

// Attach supabase client to window for debugging ONLY in browser
if (typeof window !== "undefined") {
  // @ts-ignore
  window.supabase = supabase;
}

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}

          {/* 🔥 Global cart badge + popup on every page */}
          <CartOverlay />
        </ClientProviders>

        {/* Global toast notifications */}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
