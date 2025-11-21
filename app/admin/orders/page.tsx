"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import React from "react"; 

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [etaModal, setEtaModal] = useState<{ id: string; status: string } | null>(null);
  const [etaInput, setEtaInput] = useState<string>("15");
  const etaInputRef = useRef<HTMLInputElement | null>(null);
  const [now, setNow] = useState(() => Date.now());

  
 
  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);

    // FIX 1: The query is now stabilized. 
    // - 'product:products(*)' works after dropping the ambiguous constraint.
    // - 'restaurant_item:restaurant_items!fk_rest_item(*)' uses the confirmed foreign key name.
    const { data, error } = await supabase
      .from("orders")
      .select('*,user:user_profiles(id,first_name,last_name),order_items(*,product:products(*),restaurant_item:restaurant_items!fk_rest_item(*))')
      .order(sortCol, { ascending: sortDir === "asc" });

    if (error) {
      // This should no longer show PGRST errors after the DB fix
      console.error("❌ SUPABASE ERROR:", error);
    } else {
      console.log("✅ DATA RECEIVED:", data);
      setOrders(data || []);
    }

    setLoading(false);
  }

  // Focus ETA input when modal opens
  useEffect(() => {
    if (etaModal && etaInputRef.current) {
      etaInputRef.current.focus();
      etaInputRef.current.select();
    }
  }, [etaModal]);

  /* ---------------------------------------------
     REALTIME LISTENER
  --------------------------------------------- */
  useEffect(() => {
    load();

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => load(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortCol, sortDir]);

  // Tick every second for admin-side countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------------------------------------------
     UPDATE ORDER STATUS (Optimistic Update)
  --------------------------------------------- */
  async function updateStatus(id: string, status: string, etaMinutes?: number | null) {
    const optimistic = {
      status,
      eta_minutes: status === "out_for_delivery" ? etaMinutes ?? null : null,
      out_for_delivery_at:
        status === "out_for_delivery" ? new Date().toISOString() : null,
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...optimistic } : o))
    );

    const res = await fetch("/api/admin/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        eta_minutes: status === "out_for_delivery" ? etaMinutes : undefined,
      }),
    });

    if (!res.ok) {
      console.error("Failed to update status in DB:", await res.text());
      // reload fallback
      load();
    }
  }
  function changeSort(column: string) {
    if (sortCol === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(column);
      setSortDir("desc");
    }
  }

  const formatRemaining = (ms: number | null) => {
    if (ms === null) return null;
    const clamped = Math.max(0, ms);
    const mins = Math.floor(clamped / 60000);
    const secs = Math.floor((clamped % 60000) / 1000);
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const getRemainingMs = (o: any): number | null => {
    if (!o.out_for_delivery_at || o.eta_minutes == null) return null;
    const end =
      new Date(o.out_for_delivery_at).getTime() + Number(o.eta_minutes) * 60000;
    return end - now;
  };

  const statusBadge = (status: string) => {
    const label = status.replace(/_/g, " ");
    const styles: Record<string, string> = {
      pending: "bg-amber-700/40 text-amber-100 border border-amber-500/60",
      accepted: "bg-sky-700/40 text-sky-100 border border-sky-500/60",
      out_for_delivery: "bg-green-700/40 text-green-100 border border-green-500/60",
      delivered: "bg-slate-700/60 text-slate-100 border border-slate-500/60",
      canceled: "bg-red-700/40 text-red-100 border border-red-500/60",
    };
    const cls = styles[status] || "bg-slate-700/60 text-white border border-slate-500/60";
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
  };

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  if (loading) {
    return (
      <div className="p-10 text-center text-white/70">Loading orders…</div>
    );
  }

  // Calculate stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 sm:p-8">
      {/* NAVIGATION BUTTONS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/admin/products"
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition"
        >
          🛒 Products Dashboard
        </a>
        <a
          href="/admin/users"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition"
        >
          👥 Users Dashboard
        </a>
        <a
          href="/admin/restaurants"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition"
        >
          🍽️ Restaurants Dashboard
        </a>
        <a
          href="/products"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition"
        >
          🛍️ Customer Products Page
        </a>
      </div>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Orders Dashboard</h1>
        <p className="text-gray-400">Manage and track all customer orders</p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-gray-400 text-sm mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-white">{totalOrders}</p>
        </div>
        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-800/50">
          <p className="text-blue-300 text-sm mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-400">€{totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* MOBILE CARDS */}
      <div className="grid gap-3 sm:hidden">
        {orders.map((o) => {
          const isPending = o.status === "pending";
          const isAccepted = o.status === "accepted";
          const isOut = o.status === "out_for_delivery";
          const cardClass = isPending
            ? "border-amber-400/60 bg-amber-900/30"
            : isAccepted
            ? "border-sky-400/60 bg-sky-900/30"
            : isOut
            ? "border-green-400/60 bg-green-900/30"
            : "border-slate-700 bg-slate-900/70";
          return (
            <div
              key={o.id}
              className={`rounded-xl p-4 border ${cardClass} flex flex-col gap-2`}
            >
              <div className="flex justify-between text-sm text-white/80">
                <span>{new Date(o.created_at).toLocaleString()}</span>
                {statusBadge(o.status)}
              </div>
              <div className="text-white font-bold text-lg">
                €{o.total?.toFixed(2) || "0.00"}
              </div>
              {o.status === "out_for_delivery" && o.eta_minutes && o.out_for_delivery_at && (
                <div className="text-sm text-amber-200">
                  ETA: {formatRemaining(getRemainingMs(o)) ?? "--"}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <select
                  value={o.status || "pending"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "out_for_delivery") {
                      setEtaModal({ id: o.id, status: val });
                      setEtaInput("");
                    } else {
                      updateStatus(o.id, val);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  <option value="pending" className="bg-slate-700 text-white">
                    Pending
                  </option>
                  <option value="accepted" className="bg-slate-700 text-white">
                    Accepted
                  </option>
                  <option value="out_for_delivery" className="bg-slate-700 text-white">
                    Out for delivery
                  </option>
                  <option value="delivered" className="bg-slate-700 text-white">
                    Delivered
                  </option>
                  <option value="canceled" className="bg-slate-700 text-white">
                    Canceled
                  </option>
                </select>
                {o.status === "out_for_delivery" && (
                  <button
                    onClick={() => {
                      setEtaModal({ id: o.id, status: "out_for_delivery" });
                      setEtaInput("");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-700 border border-blue-500 text-white text-sm"
                  >
                    Change ETA
                  </button>
                )}
                <button
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  {expanded === o.id ? "Hide items" : "View items"}
                </button>
              </div>
              {expanded === o.id && (
                <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 space-y-2">
                  {o.order_items?.map((item: any) => {
                    const product = item.product || item.restaurant_item;
                    const itemTotal = (item.price || 0) * (item.quantity || 1);
                    return (
                      <div key={item.id} className="flex justify-between text-sm text-white/80">
                        <span className="flex-1 min-w-0 pr-2">{product?.name || "Item"}</span>
                        <span className="text-white/60">
                          {item.quantity} × €{item.price?.toFixed(2) || "0.00"}
                        </span>
                        <span className="font-semibold text-white">
                          €{itemTotal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* DESKTOP TABLE */}
      <div className="overflow-x-auto rounded-xl bg-slate-900 border border-slate-700 shadow-lg hidden sm:block">
        <table className="w-full text-left">
          <thead className="bg-slate-800/80 text-white/90 text-sm">
            <tr>
              <th
                className="py-4 px-6 cursor-pointer select-none hover:bg-slate-700/50 transition"
                onClick={() => changeSort("created_at")}
              >
                <div className="flex items-center gap-2">
                  Time
                  {sortCol === "created_at" &&
                    (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </div>
              </th>

              <th className="py-4 px-6">Customer</th>

              <th
                className="py-4 px-6 cursor-pointer select-none hover:bg-slate-700/50 transition"
                onClick={() => changeSort("total")}
              >
                <div className="flex items-center gap-2">
                  Total
                  {sortCol === "total" &&
                    (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </div>
              </th>

              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Items</th>
              <th className="py-4 px-6 text-center">Details</th>
            </tr>
          </thead>

          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <React.Fragment key={o.id}>
                  <tr
                    className={`border-t hover:bg-slate-800/30 transition ${
                      o.status === "pending"
                        ? "bg-amber-900/30 border-amber-700/60"
                        : o.status === "accepted"
                        ? "bg-sky-900/30 border-sky-700/60"
                        : o.status === "out_for_delivery"
                        ? "bg-green-900/30 border-green-700/60"
                        : "border-slate-700/50"
                    }`}
                  >
                    <td className="py-4 px-6 text-white/90">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(o.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="text-white/90 font-medium">
                        {o.user?.first_name || "Unknown"} {o.user?.last_name || ""}
                      </div>
                      {o.user?.email && (
                        <div className="text-xs text-gray-400">{o.user.email}</div>
                      )}
                      <div className="mt-1">{statusBadge(o.status || "pending")}</div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-white font-bold text-lg">
                        €{o.total?.toFixed(2) || "0.00"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <select
                          value={o.status || "pending"}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "out_for_delivery") {
                              setEtaModal({ id: o.id, status: val });
                              setEtaInput(o.eta_minutes ? String(o.eta_minutes) : "15");
                            } else {
                              updateStatus(o.id, val);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg font-semibold text-sm cursor-pointer transition bg-slate-800 border border-slate-700 text-white"
                        >
                          <option value="pending" className="bg-slate-700 text-white">
                            Pending
                          </option>
                          <option value="accepted" className="bg-slate-700 text-white">
                            Accepted
                          </option>
                          <option value="out_for_delivery" className="bg-slate-700 text-white">
                            Out for delivery
                          </option>
                          <option value="delivered" className="bg-slate-700 text-white">
                            Delivered
                          </option>
                          <option value="canceled" className="bg-slate-700 text-white">
                            Canceled
                          </option>
                        </select>
                        {o.status === "out_for_delivery" && o.eta_minutes && o.out_for_delivery_at && (
                          <div className="text-xs text-amber-200 flex items-center gap-2">
                            <span>ETA {formatRemaining(getRemainingMs(o)) ?? "--"}</span>
                            <button
                              onClick={() => {
                                setEtaModal({ id: o.id, status: "out_for_delivery" });
                                setEtaInput("");
                              }}
                              className="px-2 py-0.5 rounded bg-blue-700 text-white text-[11px] border border-blue-500"
                            >
                              Change
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-white font-semibold text-sm">
                        {o.order_items?.length || 0}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() =>
                          setExpanded(expanded === o.id ? null : o.id)
                        }
                        className="p-2 rounded-lg hover:bg-slate-700 transition text-white"
                        aria-label={expanded === o.id ? "Collapse" : "Expand"}
                      >
                        {expanded === o.id ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </td>
                  </tr>

                  {expanded === o.id && (
                    <tr className="bg-slate-800/60 border-t border-slate-700">
                      <td colSpan={6} className="px-6 py-6">
                        <div className="space-y-3">
                          <h3 className="text-white font-semibold mb-4 text-lg">Order Items</h3>
                          <div className="grid gap-3">
                            {o.order_items?.map((item: any) => {
                              const product = item.product || item.restaurant_item;
                              const itemTotal = (item.price || 0) * (item.quantity || 1);

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 bg-slate-900/80 rounded-lg p-4 border border-slate-700 hover:bg-slate-900 transition"
                                >
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                    {product?.image_url ? (
                                      <Image
                                        src={product.image_url}
                                        alt={product.name || "Item"}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                        No Image
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-base mb-1">
                                      {product?.name || "Unknown item"}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-gray-400">
                                        Quantity: <span className="text-white font-medium">{item.quantity || 0}</span>
                                      </span>
                                      <span className="text-gray-400">
                                        Unit Price: <span className="text-white font-medium">€{item.price?.toFixed(2) || "0.00"}</span>
                                      </span>
                                    </div>
                                    {item.notes && item.notes !== "EMPTY" && item.notes.trim() && (
                                      <p className="text-blue-300 text-sm mt-2 italic">
                                        Note: {item.notes}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <p className="text-white font-bold text-lg">
                                      €{itemTotal.toFixed(2)}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      {item.quantity || 0} × €{item.price?.toFixed(2) || "0.00"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                            <div className="text-right">
                              <p className="text-gray-400 text-sm mb-1">Order Total</p>
                              <p className="text-white font-bold text-2xl">
                                €{o.total?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {etaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Set ETA</h3>
              <button
                onClick={() => setEtaModal(null)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-white/70">
              Enter the estimated minutes for this delivery.
            </p>
            <input
              type="number"
              min={1}
              className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white"
              value={etaInput}
              ref={etaInputRef}
              onChange={(e) => setEtaInput(e.target.value)}
            />
            <button
              onClick={() => {
                const etaVal = Number(etaInput);
                if (Number.isNaN(etaVal) || etaVal <= 0) return;
                updateStatus(etaModal.id, etaModal.status, etaVal);
                setEtaModal(null);
              }}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold text-white"
            >
              Save ETA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
