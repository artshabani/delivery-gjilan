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

  /* -----------------------------------------------------------
     SOUNDS
  ----------------------------------------------------------- */
  const [playStatusChange] = useSound("/sounds/status-change.mp3", { volume: 0.8 });
  const [playOutForDelivery] = useSound("/sounds/order_out_for_delivery.mp3", {
    volume: 0.9,
  });

  /* -----------------------------------------------------------
     INITIAL LOAD
  ----------------------------------------------------------- */
  useEffect(() => {
    const uid = localStorage.getItem("dg_user_id");
    if (!uid) return;

    setUserId(uid);

    const fetchOrder = async () => {
      const res = await fetch(`/api/orders/active?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order || null);
      }
    };

    fetchOrder();

    // One quick follow-up fetch to catch a just-placed order,
    // then fall back to the regular 30s cadence.
    const quick = window.setTimeout(fetchOrder, 5000);
    const poll = window.setInterval(fetchOrder, 30000);

    return () => {
      window.clearTimeout(quick);
      window.clearInterval(poll);
    };
  }, []);

  /* -----------------------------------------------------------
     CATCH NEW ORDERS FOR THIS USER (INSERT/UPDATE)
  ----------------------------------------------------------- */
  useEffect(() => {
    const uid = localStorage.getItem("dg_user_id");
    if (!uid) return;

    const channel = supabase
      .channel(`orders-user-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${uid}`,
        },
        async () => {
          const res = await fetch(`/api/orders/active?user_id=${uid}`);
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
  }, []);

  /* -----------------------------------------------------------
     ETA COUNTDOWN
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!order || !order.out_for_delivery_at || order.eta_minutes == null)
      return;

    const compute = () => {
      const start = new Date(order.out_for_delivery_at as string).getTime();
      const etaMs = (order.eta_minutes ?? 0) * 60000;

      const diff = Math.max(0, start + etaMs - Date.now());
      setRemaining(diff);
    };

    compute();
    const timer = window.setInterval(compute, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [order]);

  /* -----------------------------------------------------------
     BANNER SHAKE EVERY 5 SECONDS
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!order) return;

    const interval = window.setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [order]);

  /* -----------------------------------------------------------
     REALTIME SUBSCRIPTION
  ----------------------------------------------------------- */
  const activeOrderId = order?.id;

  useEffect(() => {
    if (!userId || !activeOrderId) return;

    const channel = supabase
      .channel(`order-realtime-${activeOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${activeOrderId}`,
        },
        async (payload) => {
          const prev = payload.old as ActiveOrder;
          const next = payload.new as ActiveOrder;

          let changed = false;

          // STATUS CHANGED
          if (prev.status !== next.status) {
            playStatusChange();
            toast.success(`Order ${next.status.replace(/_/g, " ")}`, {
              duration: 6000,
            });
            changed = true;
          }

          // OUT FOR DELIVERY
          if (
            prev.out_for_delivery_at !== next.out_for_delivery_at &&
            next.out_for_delivery_at
          ) {
            playOutForDelivery();
            toast("🚗 Courier is on the way!", {
              icon: "📦",
              duration: 6000,
              style: { background: "#0ea5e9", color: "#fff" },
            });
            changed = true;
          }

          // ETA CHANGED
          if (prev.eta_minutes !== next.eta_minutes && next.eta_minutes != null) {
            toast(`ETA updated: ${next.eta_minutes} min`, {
              icon: "⏱️",
              duration: 6000,
            });
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
  }, [userId, activeOrderId]);

  /* -----------------------------------------------------------
     RENDER
  ----------------------------------------------------------- */
  if (!order) return null;

  const etaText =
    order.status === "out_for_delivery" && order.eta_minutes
      ? remaining > 0
        ? `${Math.max(1, Math.ceil(remaining / 60000))} min`
        : "Arriving now"
      : order.status.replace(/_/g, " ");

  const statusStyles = {
    pending: { bg: "from-yellow-500 to-amber-500", text: "Awaiting pickup" },
    accepted: { bg: "from-sky-500 to-blue-500", text: "Preparing order" },
    confirmed: { bg: "from-sky-500 to-blue-500", text: "Preparing order" },
    out_for_delivery: { bg: "from-green-500 to-emerald-600", text: "Courier en route" },
    delivered: { bg: "from-gray-600 to-slate-700", text: "Delivered" },
    canceled: { bg: "from-red-500 to-rose-600", text: "Canceled" },
  };

  const palette = statusStyles[order.status as keyof typeof statusStyles];

  return (
    <>
      {/* SHAKE STYLE */}
      <style>
        {`
          @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            50% { transform: translateX(5px); }
            75% { transform: translateX(-5px); }
            100% { transform: translateX(0); }
          }
          .shake {
            animation: shake 0.6s ease-in-out;
          }
        `}
      </style>

      {/* BANNER */}
      <div className="fixed bottom-4 left-0 w-full flex justify-center z-40 px-4 pointer-events-none">
        <button
          onClick={() => setDetailsOpen(true)}
          className={`w-full max-w-xl bg-gradient-to-r ${palette.bg} border border-white/20 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-3 pointer-events-auto transition ${
            shake ? "shake" : ""
          }`}
        >
          <div>
            <p className="text-white font-semibold">Track your order</p>
            <p className="text-white/90 text-sm">
              {order.status === "out_for_delivery" && order.eta_minutes
                ? `ETA ${etaText}`
                : palette.text}
            </p>
          </div>

          <div className="text-right">
            {order.status === "out_for_delivery" ? (
              <p className="text-white font-semibold text-lg">{etaText}</p>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-semibold text-white bg-white/20">
                {order.status.replace(/_/g, " ")}
              </span>
            )}
            <p className="text-blue-100 text-xs mt-1">Tap for details</p>
          </div>
        </button>
      </div>

      {/* DETAILS MODAL */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-xl">

            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">Order details</h3>
              <button
                className="text-white/70 hover:text-white"
                onClick={() => setDetailsOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* STATUS */}
            <div className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Status</p>
                <p className="text-white font-semibold capitalize">
                  {order.status.replace(/_/g, " ")}
                </p>
                <p className="text-white/70 text-xs">{palette.text}</p>
              </div>

              {order.status === "out_for_delivery" && (
                <div className="text-center">
                  <p className="text-white/70 text-xs">ETA</p>
                  <p className="text-3xl font-bold text-white">{etaText}</p>
                </div>
              )}
            </div>

            {/* ITEMS */}
            <div className="bg-slate-800/60 rounded-xl border border-blue-500/30">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-white text-sm"
                onClick={() => setShowItems((s) => !s)}
              >
                <span className="font-semibold">
                  Items ({order.order_items?.length || 0})
                </span>
                <span className="text-white/70 text-xs">
                  {showItems ? "Hide" : "Show"}
                </span>
              </button>

              {showItems && (
                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                  {order.order_items?.map((item) => {
                    const name =
                      item.product?.name || item.restaurant_item?.name || "Item";
                    const img =
                      item.product?.image_url || item.restaurant_item?.image_url;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-slate-900/60 rounded-lg p-2 border border-slate-800"
                      >
                        <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden">
                          {img ? (
                            <img
                              src={img}
                              alt={name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="text-white text-sm font-semibold">{name}</p>
                          <p className="text-slate-300 text-xs">
                            {item.quantity} × €{item.price.toFixed(2)}
                          </p>
                        </div>

                        <p className="text-white font-semibold text-sm">
                          €{(item.quantity * item.price).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TOTAL */}
            <div className="flex justify-between items-center text-white font-semibold">
              <span>Total</span>
              <span>€{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
