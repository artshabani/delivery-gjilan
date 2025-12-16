"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminHomePage() {
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transportationFee, setTransportationFee] = useState<string>("0");
  const [savingFee, setSavingFee] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch("/api/admin/site/status");
      if (!res.ok) return;
      const data = await res.json();
      setClosed(Boolean(data.closed));
      setTransportationFee(String(data.transportation_fee || 0));
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

  const saveTransportationFee = async () => {
    setSavingFee(true);
    const res = await fetch("/api/admin/site/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transportation_fee: Number(transportationFee) }),
    });
    setSavingFee(false);
    if (res.ok) {
      alert("Transportation fee updated!");
    }
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

        {/* Transportation Fee Setting */}
        <div className="mb-4 p-4 bg-slate-900 border border-white/10 rounded-lg">
          <label className="block text-sm font-semibold text-white/90 mb-2">
            Transportation / Service Fee (€)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={transportationFee}
              onChange={(e) => setTransportationFee(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-800 border border-white/10 text-white rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="0.00"
            />
            <button
              onClick={saveTransportationFee}
              disabled={savingFee}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {savingFee ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="text-xs text-white/50 mt-2">
            This fee will be added to every order. Set to 0 to disable.
          </p>
        </div>

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
