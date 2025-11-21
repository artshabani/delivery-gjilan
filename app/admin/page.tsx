"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminHomePage() {
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch("/api/admin/site/status");
      if (!res.ok) return;
      const data = await res.json();
      setClosed(Boolean(data.closed));
    };
    fetchStatus();
  }, []);

  const toggleClosed = async () => {
    setBusy(true);
    await fetch("/api/admin/site/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: !closed }),
    });
    setClosed((s) => !s);
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">

      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Admin Panel
        </h1>

        <button
          onClick={toggleClosed}
          disabled={busy}
          className={`w-full mb-4 rounded-lg px-4 py-3 font-semibold text-white shadow ${closed
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald-600 hover:bg-emerald-700"
            }`}
        >
          {busy ? "Saving..." : closed ? "Open the store" : "Close the store"}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Link
            href="/admin/products"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-purple-400 transition 
                       text-white text-lg"
          >
            🛒 Products
          </Link>

          <Link
            href="/admin/restaurants"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-blue-400 transition 
                       text-white text-lg"
          >
            🍽️ Restaurants
          </Link>

          <Link
            href="/admin/orders"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-blue-400 transition 
                       text-white text-lg"
          >
            Orders
          </Link>
          <Link
            href="/admin/users"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-blue-400 transition 
                       text-white text-lg"
          >
            Users
          </Link>

          <Link
            href="/admin/analytics"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-cyan-400 transition 
                       text-white text-lg"
          >
            📊 Analytics
          </Link>


        </div>
      </div>

    </div>
  );
}
