"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SiteClosedOverlay() {
  const [closed, setClosed] = useState(false);
  const [closureMessage, setClosureMessage] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/site/status");
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setClosed(Boolean(data.closed));
          setClosureMessage(data.closure_message || "");
        }
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
    <div className="fixed inset-0 z-[9999] backdrop-blur-xl bg-black/80 flex items-center justify-center px-4 sm:px-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full">
        {/* Animated glow effect */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        {/* Main card */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-800/90 backdrop-blur-sm border border-purple-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-purple-900/30 text-center space-y-6">
          
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white/90 leading-relaxed">
              {closureMessage || "Na vjen keq, momentalisht dyqani nuk eshte aktiv. Kthehuni më vonë!"}
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto"></div>
          </div>

          {/* Contact section */}
          <div className="pt-4 space-y-3">
            <p className="text-white/60 text-sm">Për pyetje ose porosi urgjente:</p>
            <a
              href="tel:045205045"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>045 205 045</span>
            </a>
          </div>

          {/* Status indicator */}
          <div className="pt-4 flex items-center justify-center gap-2 text-sm text-white/50">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
