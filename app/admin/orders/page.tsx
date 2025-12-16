"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import React from "react";
import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";

interface OrderType {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
  eta_minutes?: number | null;
  out_for_delivery_at?: string | null;
  user?: { id: string; first_name: string; last_name: string };
  order_items?: Array<{
    id: number;
    quantity: number;
    price: number;
    notes?: string;
    product?: { 
      name: string; 
      image_url?: string;
      store_costs?: Array<{ wholesale_price: number }>;
    };
    restaurant_item?: { name: string; image_url?: string };
  }>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortCol, setSortCol] = useState("created_at");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [etaModal, setEtaModal] = useState<{ id: string; status: string } | null>(null);
  const [etaInput, setEtaInput] = useState<string>("15");
  const etaInputRef = useRef<HTMLInputElement | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showCompleted, setShowCompleted] = useState(false);
  const [orderProfits, setOrderProfits] = useState<Record<string, number>>({});

  // Helper function to check if order has restaurant items
  const hasRestaurantItems = (order: OrderType): boolean => {
    return order.order_items?.some((item) => item.restaurant_item !== null && item.restaurant_item !== undefined) || false;
  };

  const load = useCallback(async (showSpinner = true) => {
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
  }, [sortCol, sortDir]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [load]);

  // Tick every second for admin-side countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------------------------------------------
     CALCULATE PROFIT MARGINS
  --------------------------------------------- */
  useEffect(() => {
    const calculateOrderProfit = async (orderId: string) => {
      try {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_id, quantity, price, item_type")
          .eq("order_id", orderId);

        if (!items || items.length === 0) return 0;

        let totalProfit = 0;

        for (const item of items) {
          if (item.product_id && item.item_type === "grocery") {
            const { data: cost } = await supabase
              .from("product_store_costs")
              .select("wholesale_price")
              .eq("product_id", item.product_id)
              .eq("store_id", 28)
              .single();

            if (cost?.wholesale_price) {
              const profit = (item.price - cost.wholesale_price) * item.quantity;
              totalProfit += profit;
            }
          }
        }

        return totalProfit;
      } catch (error) {
        console.error("Error calculating profit:", error);
        return 0;
      }
    };

    const loadProfits = async () => {
      if (orders.length === 0) return;
      
      const profits: Record<string, number> = {};
      
      for (const order of orders) {
        const profit = await calculateOrderProfit(order.id);
        profits[order.id] = profit; // Always set profit, even if 0
      }
      
      setOrderProfits(profits);
    };
    
    loadProfits();
  }, [orders]);

  /* ---------------------------------------------
     UPDATE ORDER STATUS (Optimistic Update)
  --------------------------------------------- */
  async function updateStatus(id: string, status: string, etaMinutes?: number | null) {
    const optimistic = {
      status,
      eta_minutes: (status === "out_for_delivery" || status === "preparing") ? etaMinutes ?? null : null,
      out_for_delivery_at:
        status === "out_for_delivery" || status === "preparing"
          ? new Date().toISOString()
          : null,
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
        eta_minutes: (status === "out_for_delivery" || status === "preparing") ? etaMinutes : undefined,
      }),
    });

    if (!res.ok) {
      console.error("Failed to update status in DB:", await res.text());
      // reload fallback
      load();
    }
  }

  const formatRemaining = (ms: number | null) => {
    if (ms === null) return null;
    const clamped = Math.max(0, ms);
    const mins = Math.floor(clamped / 60000);
    const secs = Math.floor((clamped % 60000) / 1000);
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const getRemainingMs = (o: OrderType): number | null => {
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
      preparing: "bg-purple-700/40 text-purple-100 border border-purple-500/60",
      out_for_delivery: "bg-green-700/40 text-green-100 border border-green-500/60",
      delivered: "bg-slate-700/60 text-slate-100 border border-slate-500/60",
      canceled: "bg-red-700/40 text-red-100 border border-red-500/60",
    };
    const cls = styles[status] || "bg-slate-700/60 text-white border border-slate-500/60";
    return <span className={`px-3 py-2 rounded-lg text-sm font-semibold ${cls}`}>{label}</span>;
  };

  const getStatusFlow = (order: OrderType) => {
    const hasRestaurant = hasRestaurantItems(order);
    
    if (hasRestaurant) {
      // Full workflow with preparing step for restaurant orders
      const flows: Record<string, { current: number; steps: string[] }> = {
        pending: { current: 0, steps: ["Pending", "Accepted", "Preparing", "Out", "Delivered"] },
        accepted: { current: 1, steps: ["Pending", "Accepted", "Preparing", "Out", "Delivered"] },
        preparing: { current: 2, steps: ["Pending", "Accepted", "Preparing", "Out", "Delivered"] },
        out_for_delivery: { current: 3, steps: ["Pending", "Accepted", "Preparing", "Out", "Delivered"] },
        delivered: { current: 4, steps: ["Pending", "Accepted", "Preparing", "Out", "Delivered"] },
        canceled: { current: 0, steps: ["❌ Canceled"] },
      };
      return flows[order.status] || flows.pending;
    } else {
      // Simplified workflow without preparing step for grocery-only orders
      const flows: Record<string, { current: number; steps: string[] }> = {
        pending: { current: 0, steps: ["Pending", "Accepted", "Out", "Delivered"] },
        accepted: { current: 1, steps: ["Pending", "Accepted", "Out", "Delivered"] },
        out_for_delivery: { current: 2, steps: ["Pending", "Accepted", "Out", "Delivered"] },
        delivered: { current: 3, steps: ["Pending", "Accepted", "Out", "Delivered"] },
        canceled: { current: 0, steps: ["❌ Canceled"] },
      };
      return flows[order.status] || flows.pending;
    }
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
    <AdminGuard>
    <div className="min-h-screen w-full bg-black text-white pb-20">
      {/* MOBILE HEADER - Sticky at top */}
      <div className="sticky top-0 z-40 bg-black border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🚗 Orders</h1>
            <p className="text-white/50 text-xs mt-0.5">{activeOrders.length} active</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/70">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Scrollable */}
      <div className="px-4 py-4 space-y-3">
        {/* ACTIVE ORDERS */}
        {activeOrders.length === 0 ? (
          <div className="text-center py-16 text-white/50">
            <p className="text-lg font-semibold">✓ No active orders</p>
            <p className="text-sm mt-2">Great work! All orders complete.</p>
          </div>
        ) : (
          activeOrders.map((o) => {
            const flow = getStatusFlow(o);
            const remaining = getRemainingMs(o);
            
            return (
              <div key={o.id} className="bg-slate-900/50 border border-white/10 rounded-xl overflow-hidden">
                {/* ORDER HEADER - Customer & Amount */}
                <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 px-4 py-3 border-b border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {o.user?.first_name || "Unknown"} {o.user?.last_name || ""}
                      </h3>
                      <p className="text-xs text-white/60">
                        {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-400">
                        €{o.total?.toFixed(2) || "0.00"}
                      </div>
                      {orderProfits[o.id] !== undefined ? (
                        orderProfits[o.id] > 0 ? (
                          <div className="text-xs text-emerald-400 font-semibold">
                            💰 +€{orderProfits[o.id].toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 font-semibold">
                            💰 €0.00
                          </div>
                        )
                      ) : (
                        <div className="text-xs text-yellow-500/60 font-semibold">
                          💰 ...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* STATUS PROGRESS BAR */}
                {o.status !== "canceled" && (
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-1 mb-2">
                      {flow.steps.map((step, i) => (
                        <React.Fragment key={step}>
                          <div
                            className={`flex-1 h-2 rounded-full transition-all ${
                              i <= flow.current
                                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                : "bg-white/20"
                            }`}
                          />
                          {i < flow.steps.length - 1 && <div className="w-0.5" />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{flow.steps[flow.current]}</span>
                      <span>{flow.current + 1} / {flow.steps.length}</span>
                    </div>
                  </div>
                )}

                {/* STATUS BADGE & ETA */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
                  <div>{statusBadge(o.status)}</div>
                  {o.status === "preparing" && o.eta_minutes && (
                    <div className="text-sm font-bold text-purple-400 text-right">
                      ⏱️ {o.eta_minutes} mins prep time
                    </div>
                  )}
                  {o.status === "out_for_delivery" && remaining && remaining > 0 && (
                    <div className="text-sm font-bold text-green-400 text-right">
                      ETA: {formatRemaining(remaining)}
                    </div>
                  )}
                </div>

                {/* ITEMS PREVIEW */}
                <div className="px-4 py-3 border-b border-white/10">
                  <button
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="w-full py-2 text-white/70 hover:text-white text-sm font-medium transition"
                  >
                    {expanded === o.id ? "▼" : "▶"} Items ({o.order_items?.length || 0})
                  </button>
                  
                  {expanded === o.id && (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {o.order_items?.map((item) => {
                        const product = item.product || item.restaurant_item;
                        const itemTotal = (item.price || 0) * (item.quantity || 1);
                        
                        return (
                          <div key={item.id} className="bg-black/40 rounded-lg p-2 text-sm">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-medium text-white flex-1">{product?.name || "Item"}</span>
                              <span className="text-blue-400 font-bold">€{itemTotal.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              {item.quantity} × €{item.price?.toFixed(2) || "0.00"}
                            </div>
                            {item.notes && item.notes !== "EMPTY" && item.notes.trim() && (
                              <div className="text-xs text-yellow-400 italic mt-1 border-l-2 border-yellow-400/50 pl-2">
                                📝 {item.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS - LARGE & MOBILE-FRIENDLY */}
                <div className="px-4 py-4 space-y-2">
                  {o.status === "pending" && (
                    <>
                      <button
                        onClick={() => updateStatus(o.id, "accepted")}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-base transition active:scale-95"
                      >
                        ✓ Accept Order
                      </button>
                      <button
                        onClick={() => updateStatus(o.id, "canceled")}
                        className="w-full py-2 rounded-lg bg-red-600/70 hover:bg-red-600 text-white font-semibold text-sm transition active:scale-95"
                      >
                        ✕ Cancel
                      </button>
                    </>
                  )}

                  {o.status === "accepted" && (
                    <>
                      {hasRestaurantItems(o) ? (
                        // Restaurant order - show preparing button with ETA
                        <button
                          onClick={() => {
                            setEtaModal({ id: o.id, status: "preparing" });
                            setEtaInput("20");
                          }}
                          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-base transition active:scale-95"
                        >
                          👨‍🍳 Start Preparing (Set Time)
                        </button>
                      ) : (
                        // Grocery-only order - skip to delivery
                        <button
                          onClick={() => {
                            setEtaModal({ id: o.id, status: "out_for_delivery" });
                            setEtaInput("15");
                          }}
                          className="w-full py-3 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-base transition active:scale-95"
                        >
                          🚗 Ready - Out for Delivery
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(o.id, "canceled")}
                        className="w-full py-2 rounded-lg bg-red-600/70 hover:bg-red-600 text-white font-semibold text-sm transition active:scale-95"
                      >
                        ✕ Cancel
                      </button>
                    </>
                  )}

                  {o.status === "preparing" && (
                    <>
                      <button
                        onClick={() => {
                          setEtaModal({ id: o.id, status: "out_for_delivery" });
                          setEtaInput("15");
                        }}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-base transition active:scale-95"
                      >
                        🚗 Ready - Out for Delivery
                      </button>
                      <button
                        onClick={() => updateStatus(o.id, "canceled")}
                        className="w-full py-2 rounded-lg bg-red-600/70 hover:bg-red-600 text-white font-semibold text-sm transition active:scale-95"
                      >
                        ✕ Cancel
                      </button>
                    </>
                  )}

                  {o.status === "out_for_delivery" && (
                    <>
                      <button
                        onClick={() => updateStatus(o.id, "delivered")}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-base transition active:scale-95"
                      >
                        ✓ Delivered
                      </button>
                      <button
                        onClick={() => {
                          setEtaModal({ id: o.id, status: "out_for_delivery" });
                          setEtaInput(o.eta_minutes?.toString() || "15");
                        }}
                        className="w-full py-2 rounded-lg bg-blue-600/70 hover:bg-blue-600 text-white font-semibold text-sm transition active:scale-95"
                      >
                        ⏱ Update ETA: {o.eta_minutes || "?"} mins
                      </button>
                    </>
                  )}

                  {/* MANUAL STATUS DROPDOWN - Always visible */}
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
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white/70 text-xs hover:bg-slate-700 transition cursor-pointer"
                  >
                    <option value="pending">Change status...</option>
                    <option value="pending">← Pending</option>
                    <option value="accepted">← Accepted</option>
                    {hasRestaurantItems(o) && <option value="preparing">← Preparing</option>}
                    <option value="out_for_delivery">← Out for Delivery</option>
                    <option value="delivered">← Delivered</option>
                    <option value="canceled">✕ Canceled</option>
                  </select>
                </div>
              </div>
            );
          })
        )}

        {/* COMPLETED ORDERS SECTION */}
        {completedOrders.length > 0 && (
          <div className="mt-8 space-y-3">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 transition"
            >
              <h2 className="text-base font-bold text-white/70">
                {showCompleted ? "▼" : "▶"} Completed ({completedOrders.length})
              </h2>
            </button>

            {showCompleted && (
              <div className="space-y-2">
                {completedOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-slate-900/30 border border-white/5 rounded-lg p-3 opacity-70"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <div className="font-semibold text-white/70">
                          {o.user?.first_name || "Unknown"} {o.user?.last_name || ""}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {new Date(o.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white/60">€{o.total?.toFixed(2) || "0.00"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="px-2 py-1 rounded bg-slate-800/70 border border-slate-600 text-white/60 text-xs hover:bg-slate-700 transition cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        {hasRestaurantItems(o) && <option value="preparing">Preparing</option>}
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
      </div>

      {etaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-bold text-white">
                {etaModal.status === "preparing" ? "⏱️ Prep Time" : "🚗 Delivery ETA"}
              </h3>
              <button
                onClick={() => setEtaModal(null)}
                className="text-white/70 hover:text-white text-3xl transition w-10 h-10 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-lg text-white/70">
              {etaModal.status === "preparing" 
                ? "How many minutes to prepare the food?"
                : "How many minutes until delivery?"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(etaModal.status === "preparing" ? [10, 15, 20, 25, 30, 45] : [5, 10, 15, 20, 30, 45]).map((mins) => (
                <button
                  key={mins}
                  onClick={() => setEtaInput(mins.toString())}
                  className={`py-4 rounded-xl font-bold text-base transition ${
                    etaInput === mins.toString()
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-slate-800 text-white/70 hover:bg-slate-700"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <div>
              <label className="text-sm text-white/60 block mb-2">Or enter custom minutes:</label>
              <input
                type="number"
                min={1}
                className="w-full p-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-2xl text-center font-semibold focus:border-blue-500 focus:outline-none transition"
                value={etaInput}
                ref={etaInputRef}
                onChange={(e) => setEtaInput(e.target.value)}
                placeholder="Enter minutes..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setEtaModal(null)}
                className="flex-1 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white/70 font-bold text-lg transition active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const etaVal = Number(etaInput);
                  if (Number.isNaN(etaVal) || etaVal <= 0) return;
                  updateStatus(etaModal.id, etaModal.status, etaVal);
                  setEtaModal(null);
                }}
                className="flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-lg transition active:scale-95 shadow-lg shadow-blue-500/50"
              >
                Save ETA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
