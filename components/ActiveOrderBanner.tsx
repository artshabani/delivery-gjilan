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
  admin_message?: string | null;
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
  const [showItems, setShowItems] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
     1. GET USER ID AND CHECK IF ADMIN
  ----------------------------------------------------------- */
  useEffect(() => {
    let interval: number | undefined;

    const checkUser = async () => {
      const uid = localStorage.getItem("dg_user_id");
      if (!uid) return;

      setUserId(uid);
      
      // Check if user is admin
      const { data } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", uid)
        .single();
      
      if (data?.role === "admin") {
        setIsAdmin(true);
      }
      
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

          let toastShown = false;

          // Only show ONE toast per update - prioritize status changes
          if (prev.status !== next.status && !toastShown) {
            playStatusChange();
            toast.dismiss();
            toast.success(`Order ${next.status.replace(/_/g, " ")}`, { duration: 6000 });
            toastShown = true;
          }
          else if (prev.admin_message !== next.admin_message && !toastShown) {
            if (next.admin_message) {
              toast.dismiss();
              toast(`📢 ${next.admin_message}`, { icon: "💬", duration: 8000 });
              toastShown = true;
            }
          }
          else if (prev.out_for_delivery_at !== next.out_for_delivery_at && next.out_for_delivery_at && !toastShown) {
            playOutForDelivery();
            toast.dismiss();
            toast("🚗 Courier is on the way!", {
              icon: "📦",
              duration: 6000,
              style: { background: "#0ea5e9", color: "white" },
            });
            toastShown = true;
          }
          else if (prev.eta_minutes !== next.eta_minutes && next.eta_minutes != null && !toastShown) {
            toast.dismiss();
            toast(`ETA updated: ${next.eta_minutes} min`, { icon: "⏱️", duration: 6000 });
            toastShown = true;
          }

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

  // Don't show fullscreen modal for admins
  if (isAdmin) {
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
    pending: { 
      bg: "from-amber-500 to-yellow-500", 
      bgDim: "bg-amber-500/20 border-amber-500/30",
      accent: "bg-amber-500/20 border-amber-500/30",
      text: "Prisni korierin", 
      color: "text-amber-400" 
    },
    accepted: { 
      bg: "from-blue-500 to-cyan-500", 
      bgDim: "bg-blue-500/20 border-blue-500/30",
      accent: "bg-blue-500/20 border-blue-500/30",
      text: "Porosia u pranua", 
      color: "text-blue-400" 
    },
    preparing: { 
      bg: "from-purple-500 to-pink-500", 
      bgDim: "bg-purple-500/20 border-purple-500/30",
      accent: "bg-purple-500/20 border-purple-500/30",
      text: "Duke përpunuar...", 
      color: "text-purple-400" 
    },
    out_for_delivery: { 
      bg: "from-green-500 to-emerald-500", 
      bgDim: "bg-green-500/20 border-green-500/30",
      accent: "bg-green-500/20 border-green-500/30",
      text: "Korieri rruges...", 
      color: "text-green-400" 
    },
    delivered: { 
      bg: "from-slate-400 to-slate-500", 
      bgDim: "bg-slate-500/20 border-slate-500/30",
      accent: "bg-slate-500/20 border-slate-500/30",
      text: "Delivered", 
      color: "text-slate-400" 
    },
    canceled: { 
      bg: "from-red-500 to-rose-500", 
      bgDim: "bg-red-500/20 border-red-500/30",
      accent: "bg-red-500/20 border-red-500/30",
      text: "Canceled", 
      color: "text-red-400" 
    },
  };

  const palette = statusStyles[order.status as keyof typeof statusStyles] || statusStyles.pending;

  /* -----------------------------------------------------------
     JSX
  ----------------------------------------------------------- */
  return (
    <>
      <style>
        {`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.3); }
            50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.5); }
          }
          .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        `}
      </style>

      {/* FULLSCREEN MODAL - Always visible when there's an active order */}
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-2xl my-auto">
          {/* Main Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden pulse-glow">
            
            {/* Header */}
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white">
                    📦 Your Order
                  </h2>
                  <p className="text-white/50 text-sm mt-1">Track your order status</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40 uppercase tracking-wider">ID</p>
                  <p className="text-white/70 font-mono text-sm">#{order.id.slice(0, 8)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              
              {/* STATUS */}
              <div className={`bg-gradient-to-r ${palette.bg} rounded-xl p-6 flex items-center justify-between shadow-lg`}>
                <div>
                  <p className="text-white/80 text-xs uppercase tracking-wider font-semibold">Status</p>
                  <p className="font-bold capitalize text-white text-2xl mt-2">
                    {order.status.replace(/_/g, " ")}
                  </p>
                  <p className="text-white/70 text-sm mt-2">{palette.text}</p>
                </div>

                {(order.status === "out_for_delivery" || order.status === "preparing") && (
                  <div className={`text-center rounded-xl p-4 border ${palette.accent}`}>
                    <p className={`${palette.color} text-xs uppercase tracking-wider font-semibold`}>
                      {order.status === "preparing" ? "Prep" : "ETA"}
                    </p>
                    <p className={`text-4xl font-bold ${palette.color} mt-2`}>{etaText}</p>
                  </div>
                )}
              </div>

              {/* ADMIN MESSAGE - Highlighted with amber */}
              {order.admin_message && (
                <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-xl p-5 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">🔔</div>
                    <div className="flex-1">
                      <p className="text-amber-300 text-xs uppercase tracking-wider font-bold mb-1">Important Message</p>
                      <p className="text-white text-base font-semibold leading-relaxed">{order.admin_message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ITEMS */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-white font-semibold hover:bg-white/10 transition"
                  onClick={() => setShowItems((s) => !s)}
                >
                  <span className="text-lg">
                    📦 Items ({order.order_items?.length || 0})
                  </span>
                  <span className="text-white/60 text-xl">{showItems ? "▼" : "▶"}</span>
                </button>

                {showItems && (
                  <div className="border-t border-white/10 p-4 space-y-3 max-h-80 overflow-y-auto">
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
                          className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition"
                        >
                          <div className="w-16 h-16 rounded-lg bg-white/10 overflow-hidden flex-shrink-0 border border-white/10">
                            {img ? (
                              <img src={img} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/20">📦</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-white text-base font-semibold truncate">{name}</p>
                            <p className="text-white/50 text-sm mt-1">
                              {item.quantity} × €{item.price.toFixed(2)}
                            </p>
                          </div>

                          <p className="text-blue-400 font-bold text-lg flex-shrink-0">
                            €{(item.quantity * item.price).toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TOTAL */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 flex justify-between items-center">
                <span className="text-white text-lg font-semibold">Total</span>
                <span className="text-3xl font-bold text-blue-400">
                  €{order.total.toFixed(2)}
                </span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
