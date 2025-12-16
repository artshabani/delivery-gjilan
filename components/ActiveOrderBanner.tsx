"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import useSound from "use-sound";

/* -----------------------------------------------------------
   TYPES
----------------------------------------------------------- */
interface ActiveOrder {
  id: string;
  total: number;
  status: string;
  eta_minutes: number | null;
  out_for_delivery_at: string | null;
  order_items?: {
    id: string | number;
    quantity: number;
    price: number;
    notes?: string | null;
    product?: { id: number; name: string; image_url: string | null } | null;
    restaurant_item?: {
      id: number;
      name: string;
      image_url: string | null;
    } | null;
  }[];
}

export default function ActiveOrderBanner() {
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------
     SOUNDS
  --------------------------------------------- */
  const [playStatusChange] = useSound("/sounds/status-change.mp3", { volume: 0.8 });
  const [playOutForDelivery] = useSound("/sounds/order_out_for_delivery.mp3", {
    volume: 0.9,
  });

  /* -----------------------------------------------------------
     1. GET USER ID
  ----------------------------------------------------------- */
  useEffect(() => {
    let interval: number | undefined;

    const checkUser = async () => {
      const uid = localStorage.getItem("dg_user_id");
      if (!uid) return;

      setUserId(uid);
      setLoading(false);

      const res = await fetch(`/api/orders/active?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order || null);
      }

      if (interval) clearInterval(interval);
    };

    checkUser();
    interval = window.setInterval(checkUser, 400);

    return () => clearInterval(interval);
  }, []);

  /* -----------------------------------------------------------
     2. INITIAL FETCH
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const fetchOrder = async () => {
      const res = await fetch(`/api/orders/active?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order || null);
      }
    };

    fetchOrder();
    const quick = window.setTimeout(fetchOrder, 5000);
    const poll = window.setInterval(fetchOrder, 30000);

    return () => {
      clearTimeout(quick);
      clearInterval(poll);
    };
  }, [userId]);

  /* -----------------------------------------------------------
     3. LISTEN FOR USER ORDER UPDATES
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        async () => {
          const res = await fetch(`/api/orders/active?user_id=${userId}`);
          if (!res.ok) return;
          const data = await res.json();
          setOrder(data.order || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* -----------------------------------------------------------
     4. LISTEN FOR REALTIME UPDATES FOR THIS ORDER
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!userId || !order?.id) return;

    const id = order.id;

    const channel = supabase
      .channel(`order-realtime-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        async (payload) => {
          const prev = payload.old as ActiveOrder;
          const next = payload.new as ActiveOrder;

          let changed = false;

          if (prev.status !== next.status) {
            playStatusChange();
            toast.success(`Order ${next.status.replace(/_/g, " ")}`, { duration: 6000 });
            changed = true;
          }

          if (prev.out_for_delivery_at !== next.out_for_delivery_at && next.out_for_delivery_at) {
            playOutForDelivery();
            toast("🚗 Courier is on the way!", {
              icon: "📦",
              duration: 6000,
              style: { background: "#0ea5e9", color: "white" },
            });
            changed = true;
          }

          if (prev.eta_minutes !== next.eta_minutes && next.eta_minutes != null) {
            toast(`ETA updated: ${next.eta_minutes} min`, { icon: "⏱️", duration: 6000 });
            changed = true;
          }

          if (!changed) return;

          const res = await fetch(`/api/orders/active?user_id=${userId}`);
          if (res.ok) {
            const data = await res.json();
            setOrder(data.order || null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, order?.id]);

  /* -----------------------------------------------------------
     5. ETA TIMER (for both preparing and out_for_delivery)
  ----------------------------------------------------------- */
  useEffect(() => {
    // guard nulls
    if (!order || order.eta_minutes == null) return;

    // Use stored timestamp (out_for_delivery_at reused as "started_at" for preparing)
    const referenceTime = order.out_for_delivery_at || new Date().toISOString();

    const compute = () => {
      const start = new Date(referenceTime).getTime();
      const etaMinutes = order.eta_minutes ?? 0;
      const etaMs = etaMinutes * 60000;
      const diff = Math.max(0, start + etaMs - Date.now());
      setRemaining(diff);
    };

    compute();
    const t = window.setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [order?.out_for_delivery_at, order?.eta_minutes, order?.status, order]);

  /* -----------------------------------------------------------
     6. SHAKE ANIMATION
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!order) return;

    const interval = window.setInterval(() => {
      setShake(true);
      window.setTimeout(() => setShake(false), 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [order]);

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  if (!order || loading) {
    return null;
  }

  /* ETA TEXT */
  const etaText = (() => {
    if ((order.status === "preparing" || order.status === "out_for_delivery") && order.eta_minutes) {
      if (remaining > 0) {
        return `${Math.max(1, Math.ceil(remaining / 60000))} min`;
      }
      return order.status === "preparing" ? "Ready!" : "Anytime";
    }
    return order.status.replace(/_/g, " ");
  })();

  const statusStyles = {
    pending: { bg: "from-yellow-500 to-amber-500", text: "Prisni korierin", color: "text-yellow-400" },
    accepted: { bg: "from-sky-500 to-blue-500", text: "Porosia u pranua", color: "text-blue-400" },
    preparing: { bg: "from-purple-500 to-blue-500", text: "Duke përpunuar...", color: "text-purple-400" },
    confirmed: { bg: "from-sky-500 to-blue-500", text: "Preparing order", color: "text-blue-400" },
    out_for_delivery: { bg: "from-green-500 to-emerald-600", text: "Korieri rruges...", color: "text-green-400" },
    delivered: { bg: "from-gray-600 to-slate-700", text: "Delivered", color: "text-gray-400" },
    canceled: { bg: "from-red-500 to-rose-600", text: "Canceled", color: "text-red-400" },
  };

  const palette = statusStyles[order.status as keyof typeof statusStyles] || statusStyles.pending;

  /* -----------------------------------------------------------
     JSX
  ----------------------------------------------------------- */
  return (
    <>
      <style>
        {`
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
          }
          .shake { animation: shake 0.6s ease-in-out; }
        `}
      </style>

      {/* BANNER */}
      <div className="fixed bottom-4 left-0 w-full flex justify-center z-40 px-4 pointer-events-none">
        <button
          onClick={() => setDetailsOpen(true)}
          className={`w-full max-w-xl bg-gradient-to-r ${palette.bg} border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-3 pointer-events-auto transition ${shake ? "shake" : ""
            }`}
        >
          <div>
            <p className="text-white font-semibold">Percjell porosine</p>
            <p className="text-white/90 text-sm">
              {order.status === "preparing" && order.eta_minutes
                ? `Prep ${etaText}`
                : order.status === "out_for_delivery" && order.eta_minutes
                  ? `ETA ${etaText}`
                  : palette.text}
            </p>
          </div>

          <div className="text-right">
            {order.status === "preparing" && order.eta_minutes ? (
              <p className="text-white font-semibold text-lg">{etaText}</p>
            ) : order.status === "out_for_delivery" ? (
              <p className="text-white font-semibold text-lg">{etaText}</p>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-semibold text-white bg-white/20">
                {order.status.replace(/_/g, " ")}
              </span>
            )}
            <p className="text-blue-100 text-xs mt-1">Prek per detaje</p>
          </div>
        </button>
      </div>

      {/* MODAL */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Order details</h3>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition text-white"
                onClick={() => setDetailsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* STATUS */}
            <div className={`${palette.bg} rounded-2xl p-4 flex items-center justify-between bg-gradient-to-r`}>
              <div>
                <p className="text-white/80 text-xs uppercase tracking-wide">Status</p>
                <p className="font-bold capitalize text-white text-lg mt-1">
                  {order.status.replace(/_/g, " ")}
                </p>
                <p className="text-white/70 text-xs mt-1">{palette.text}</p>
              </div>

              {(order.status === "out_for_delivery" || order.status === "preparing") && (
                <div className="text-center">
                  <p className="text-white/70 text-xs uppercase">
                    {order.status === "preparing" ? "Prep Time" : "ETA"}
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">{etaText}</p>
                </div>
              )}
            </div>

            {/* ITEMS */}
            <div className="bg-slate-800/40 rounded-2xl">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-white text-sm font-semibold hover:bg-slate-800/60 transition rounded-t-2xl"
                onClick={() => setShowItems((s) => !s)}
              >
                <span>
                  Items ({order.order_items?.length || 0})
                </span>
                <span className="text-white/60 text-xs">{showItems ? "▼" : "▶"}</span>
              </button>

              {showItems && (
                <div className="border-t border-white/10 p-3 space-y-2 max-h-64 overflow-y-auto rounded-b-2xl">
                  {order.order_items?.map((item) => {
                    const name =
                      item.product?.name ||
                      item.restaurant_item?.name ||
                      "Item";
                    const img =
                      item.product?.image_url || item.restaurant_item?.image_url;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-slate-900/40 rounded-lg p-3 hover:bg-slate-900/60 transition"
                      >
                        <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                          {img ? (
                            <img src={img} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No image</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">{name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {item.quantity} × €{item.price.toFixed(2)}
                          </p>
                        </div>

                        <p className="text-blue-400 font-semibold text-sm flex-shrink-0">
                          €{(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 flex justify-between items-center">
              <span className="text-white/80 font-semibold">Total</span>
              <span className="text-2xl font-bold text-blue-400">€{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
