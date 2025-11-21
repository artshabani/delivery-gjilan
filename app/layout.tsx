import "./globals.css";
import { ReactNode } from "react";
import { ClientProviders } from "./ClientProviders";
import { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import CartOverlay from "@/components/cart/CartOverlay";
import { Analytics } from '@vercel/analytics/next';
import ActiveOrderBanner from "@/components/ActiveOrderBanner";
import SiteClosedOverlay from "@/components/SiteClosedOverlay";


export const metadata = {
  title: "PrePhase0",
  description: "Delivery Gjilan Pre-Phase 0",
};

// Attach supabase client to window for debugging ONLY in browser
if (typeof window !== "undefined") {
  // @ts-expect-error attach for debugging only
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
          <Analytics />
          {/* 🔥 Global cart badge + popup on every page */}
          <CartOverlay />
          <ActiveOrderBanner />
          <SiteClosedOverlay />
        </ClientProviders>

        {/* Global toast notifications */}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
