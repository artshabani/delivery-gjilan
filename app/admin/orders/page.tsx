"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
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
  const [showCompleted, setShowCompleted] = useState(false);



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

  // Split orders into active and delivered
  const activeOrders = orders.filter((o) => o.status !== "delivered" && o.status !== "canceled");
  const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "canceled");

  return (
    <div className="min-h-screen w-full bg-black text-white p-4 sm:p-6">
      {/* NAVIGATION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <a
          href="/admin/users"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-105"
        >
          <span className="text-xl">👥</span>
          <span>Users</span>
        </a>
        <a
          href="/admin/orders"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105"
        >
          <span className="text-xl">📦</span>
          <span>Orders</span>
        </a>
        <a
          href="/admin/products"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-105"
        >
          <span className="text-xl">🏷️</span>
          <span>Products</span>
        </a>
        <a
          href="/admin/restaurants"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/50 hover:scale-105"
        >
          <span className="text-xl">🍽️</span>
          <span>Restaurants</span>
        </a>
        <a
          href="/admin/analytics"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
        >
          <span className="text-xl">📊</span>
          <span>Analytics</span>
        </a>
      </div>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">🚗 Driver Dashboard</h1>
        <p className="text-white/60 text-sm mt-1">Active deliveries & orders</p>
      </div>

      {/* ACTIVE ORDERS SECTION */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Active Orders ({activeOrders.length})
          </h2>
        </div>

        {/* DRIVER CARDS - ACTIVE ORDERS */}
        <div className="space-y-3">
          {activeOrders.length === 0 ? (
            <div className="text-center py-12 text-white/60">
              <p className="text-lg">No active orders</p>
            </div>
          ) : (
            activeOrders.map((o) => {
              const isPending = o.status === "pending";
              const isAccepted = o.status === "accepted";
              const isOut = o.status === "out_for_delivery";
              const cardClass = isPending
                ? "border-l-4 border-l-yellow-500 bg-yellow-500/10"
                : isAccepted
                  ? "border-l-4 border-l-blue-500 bg-blue-500/10"
                  : isOut
                    ? "border-l-4 border-l-green-500 bg-green-500/10"
                    : "border-l-4 border-l-slate-600 bg-slate-800/40";
              
              const remaining = getRemainingMs(o);
              return (
                <div key={o.id} className={`rounded-lg p-4 border border-white/10 ${cardClass} flex flex-col gap-3`}>
                  {/* Header: Customer Name & Total */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-xl font-bold text-white">
                        {o.user?.first_name || "Unknown"} {o.user?.last_name || ""}
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-400">€{o.total?.toFixed(2) || "0.00"}</div>
                      {isOut && remaining && remaining > 0 && (
                        <div className="text-xs text-green-400 font-semibold mt-1">
                          ETA: {formatRemaining(remaining)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div>{statusBadge(o.status)}</div>

                  {/* Quick Status Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {o.status === "pending" && (
                      <>
                        <button
                          onClick={() => updateStatus(o.id, "accepted")}
                          className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => updateStatus(o.id, "canceled")}
                          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {o.status === "accepted" && (
                      <>
                        <button
                          onClick={() => {
                            setEtaModal({ id: o.id, status: "out_for_delivery" });
                            setEtaInput("15");
                          }}
                          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition"
                        >
                          Out for Delivery
                        </button>
                        <button
                          onClick={() => updateStatus(o.id, "canceled")}
                          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {o.status === "out_for_delivery" && (
                      <>
                        <button
                          onClick={() => updateStatus(o.id, "delivered")}
                          className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
                        >
                          Delivered
                        </button>
                        <button
                          onClick={() => {
                            setEtaModal({ id: o.id, status: "out_for_delivery" });
                            setEtaInput(o.eta_minutes?.toString() || "15");
                          }}
                          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition"
                        >
                          Update ETA
                        </button>
                      </>
                    )}

                    {/* Manual Status Override Dropdown */}
                    <select
                      value={o.status || "pending"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "out_for_delivery") {
                          setEtaModal({ id: o.id, status: val });
                          setEtaInput("15");
                        } else {
                          updateStatus(o.id, val);
                        }
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-600 text-white text-sm hover:bg-slate-700 transition"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>

                  {/* Items Preview */}
                  <button
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-sm transition"
                  >
                    {expanded === o.id ? "Hide Items" : `Show Items (${o.order_items?.length || 0})`}
                  </button>

                  {expanded === o.id && (
                    <div className="bg-black/40 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                      {o.order_items?.map((item: any) => {
                        const product = item.product || item.restaurant_item;
                        const itemTotal = (item.price || 0) * (item.quantity || 1);
                        return (
                          <div key={item.id} className="text-sm text-white/70">
                            <div className="flex justify-between">
                              <span className="font-medium text-white">{product?.name || "Item"}</span>
                              <span className="text-blue-400 font-semibold">€{itemTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-white/50 mt-0.5">
                              {item.quantity} × €{item.price?.toFixed(2) || "0.00"}
                            </div>
                            {item.notes && item.notes !== "EMPTY" && item.notes.trim() && (
                              <div className="text-xs text-yellow-400 italic mt-1">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COMPLETED ORDERS TOGGLE SECTION */}
      {completedOrders.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 transition mb-4"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-slate-500 rounded-full"></span>
              Completed Orders ({completedOrders.length})
            </h2>
            <span className="text-white/60">{showCompleted ? "▼" : "▶"}</span>
          </button>

          {showCompleted && (
            <div className="space-y-3">
              {completedOrders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-lg p-4 border border-white/10 bg-slate-800/30 flex flex-col gap-2 opacity-75"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-white/80">
                        {o.user?.first_name || "Unknown"} {o.user?.last_name || ""}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {new Date(o.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white/80">€{o.total?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    {statusBadge(o.status)}
                    <select
                      value={o.status || "delivered"}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "out_for_delivery") {
                          setEtaModal({ id: o.id, status: val });
                          setEtaInput("15");
                        } else {
                          updateStatus(o.id, val);
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-800/70 border border-slate-600 text-white/80 text-xs hover:bg-slate-700 transition"
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
