"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SiteClosedOverlay() {
  const [closed, setClosed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/site/status");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setClosed(Boolean(data.closed));
      } catch {
        // fail open
      }
    };

    // check immediately on navigation
    fetchStatus();
    const poll = setInterval(fetchStatus, 30000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [pathname]);

  // Never block the admin area
  if (pathname?.startsWith("/admin")) return null;

  if (!closed) return null;

  return (
    <div className="fixed inset-0 z-[9999] backdrop-blur-md bg-black/70 flex items-center justify-center text-center px-6">
      <div className="max-w-xl w-full bg-slate-900/80 border border-purple-500/40 rounded-3xl p-8 shadow-2xl text-white space-y-3">
        <p className="text-3xl font-bold">S'jemi tu punu</p>
        <p className="text-white/80">
          Kthemi pak ma vone! Kontakto 045205045
        </p>
      </div>
    </div>
  );
}
