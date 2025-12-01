"use client";

import { useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

export default function CartOverlay() {
  const MIN_ORDER_TOTAL = 4;

  const {
    items: cartItems,
    totalQuantity,
    subtotal,
    restaurantMixFee,
    totalPrice,
    addItem,
    decreaseItem,
    clearCart,
  } = useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmOrderOpen, setConfirmOrderOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const hasCart = totalQuantity > 0;

  /* -------------------------------------------------------
     REQUIRE USER ID
  -------------------------------------------------------- */
  const requireUserId = () => {
    const userId = localStorage.getItem("dg_user_id");

    if (!userId) {
      toast.custom(
        (t) => (
          <div
            className={`${t.visible ? "animate-enter" : "animate-leave"
              } fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
              bg-slate-900 text-white px-6 py-5 rounded-2xl shadow-xl 
              border border-red-500/40 w-[92%] max-w-sm text-center`}
          >
            <p className="text-lg font-semibold text-red-400 mb-2">
              User Not Found
            </p>
            <p className="text-white/80 text-sm leading-relaxed">
              Nuk u gjet useri. Ju lutem skenoni QR CODE tuaj personal ose kontakto <br />
              <strong>045-205-045</strong>.
            </p>
          </div>
        ),
        { duration: 5000 }
      );

      return null;
    }

    return userId;
  };

  /* -------------------------------------------------------
     REQUIRE MINIMUM TOTAL (uses FINAL totalPrice)
  -------------------------------------------------------- */
  const requireMinimumTotal = () => {
    if (totalPrice < MIN_ORDER_TOTAL) {
      toast.error(
        `Shuma minimale e porosise eshte €${MIN_ORDER_TOTAL.toFixed(2)}.`
      );
      return false;
    }
    return true;
  };

  /* -------------------------------------------------------
     PLACE ORDER
  -------------------------------------------------------- */
  async function placeOrder() {
    try {
      toast.dismiss();
      const userId = requireUserId();
      const hasMinimum = requireMinimumTotal();
      if (!userId || !hasMinimum) return;

      setPlacingOrder(true);

      // Check for active orders first
      try {
        const res = await fetch(`/api/orders/active?user_id=${userId}`);
        const data = await res.json();

        if (data.order) {
          setPlacingOrder(false);
          toast.error("Ju keni nje porosi aktive! Prisni derisa te perfundoje.");
          return;
        }
      } catch (err) {
        console.error("Error checking active orders:", err);
        // We continue if the check fails, or you could block it. 
        // For now, let's assume we continue or maybe show error? 
        // Safest is to probably alert user but let's just log for now to not block if API fails.
      }

      const orderPayload: any = {
        total: totalPrice,
        created_at: new Date().toISOString(),
        user_id: userId,
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (!order || orderErr) {
        console.error("Order creation error:", orderErr);
        setPlacingOrder(false);
        toast.error("Failed to create order");
        return;
      }

      const orderId = order.id;

      const itemsPayload = cartItems.map(({ product, quantity }) => ({
        order_id: orderId,
        product_id: product.type === "grocery" ? product.id : null,
        restaurant_item_id: product.type === "restaurant" ? product.id : null,
        quantity,
        price: product.price,
        notes: product.notes ?? null,
        modifiers: product.modifiers ?? null,
        item_type: product.type ?? "grocery",
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsErr) {
        console.error("Order items error:", itemsErr);
        setPlacingOrder(false);
        toast.error("Failed to add items");
        return;
      }

      await fetch(
        "https://qnwnybyebiczlwxssblx.supabase.co/functions/v1/send-order-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            total: totalPrice,
            subtotal,
            restaurantMixFee,
            userId,
            items: cartItems.map(({ product, quantity }) => ({
              name: product.name,
              quantity,
              price: product.price,
              notes: product.notes || null,
              image_url: product.image_url,
              restaurant_name: product.restaurant_name || null,
            })),
          }),
        }
      );

      clearCart();
      setPlacingOrder(false);
      setOrderSuccess(true);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 99999,
      });

      setTimeout(() => setOrderSuccess(false), 2000);
    } catch (err) {
      setPlacingOrder(false);
      toast.error("Unexpected error.");
    }
  }

  /* -------------------------------------------------------
     CART BODY RENDER
  -------------------------------------------------------- */
  const cartBody = (
    <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
      {cartItems.length === 0 && (
        <p className="text-sm text-white/60">Your cart is empty.</p>
      )}

      {cartItems.map(({ product, quantity }) => {
        const price =
          product.is_on_sale && product.sale_price
            ? product.sale_price
            : product.price;

        return (
          <div
            key={`${product.id}-${product.notes ?? ""}`}
            className="flex items-center justify-between gap-3 bg-slate-800/80 rounded-xl px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-lg bg-slate-900 overflow-hidden">
                <Image
                  src={
                    product.image_url?.startsWith("http")
                      ? product.image_url
                      : "/fallback.jpg"
                  }
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="max-w-[160px]">
                <p className="text-sm font-medium text-white">{product.name}</p>

                {product.restaurant_name && (
                  <p className="text-xs text-purple-300 mt-0.5">📍 {product.restaurant_name}</p>
                )}

                {product.notes && (
                  <p className="text-xs text-blue-300 mt-1">{product.notes}</p>
                )}

                {product.is_on_sale && product.sale_price ? (
                  <div className="flex flex-col leading-tight mt-1">
                    <span className="text-green-400 font-semibold text-xs">
                      €{product.sale_price.toFixed(2)} each
                    </span>
                    <span className="text-red-400 text-[11px] line-through opacity-70">
                      €{product.price.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-white/50">
                    €{product.price.toFixed(2)} each
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={() => decreaseItem(String(product.id))}
                className="w-7 h-7 bg-slate-700 rounded-full text-white text-sm flex items-center justify-center"
              >
                -
              </button>

              <span className="text-sm font-semibold text-white">
                {quantity}
              </span>

              <button
                onClick={() => addItem(product, 1, product.notes ?? "")}
                className="w-7 h-7 bg-blue-600 rounded-full text-white text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* -------------------------------------------------------
     RENDER
  -------------------------------------------------------- */
  return (
    <>
      {/* CART BADGE */}
      {hasCart && !isCartOpen && (
        <div className="fixed bottom-5 left-0 w-full flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => setIsCartOpen(true)}
            className="dg-cart-btn pointer-events-auto w-[85%] py-4 rounded-full bg-[#2563eb] text-white shadow-[0_6px_20px_rgba(0,0,0,0.45)] flex items-center justify-between px-6 active:scale-95 transition"
          >
            <span className="flex items-center gap-3 text-base">
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                {totalQuantity}
              </span>
              View order
            </span>

            <span className="text-base font-bold text-white">
              €{totalPrice.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* CART POPUP */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="relative z-10 w-[92%] max-w-md cart-border-track-blue">
            <div className="bg-slate-900 rounded-2xl shadow-2xl p-4 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-white">Your cart</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-7 h-7 bg-slate-800 rounded-full text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {cartBody}

              {/* SUBTOTAL */}
              <div className="mt-4 border-t border-white/10 pt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-white/80">Subtotal</span>
                  <span className="text-sm text-white/80">
                    €{subtotal.toFixed(2)}
                  </span>
                </div>

                {restaurantMixFee > 0 && (
                  <div className="flex justify-between items-center text-yellow-300">
                    <span className="text-sm flex items-center gap-1.5">
                      <Info size={16} />
                      Order from 2 restaurants fee
                    </span>
                    <span className="text-sm">+€{restaurantMixFee.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-1">
                  <span className="text-base font-bold text-white">Total</span>
                  <span className="text-base font-bold text-white">
                    €{totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="flex-1 py-2 bg-red-600/80 rounded-xl text-white"
                >
                  Clear Cart
                </button>

                <button
                  onClick={() => {
                    if (!requireMinimumTotal()) return;
                    const userId = requireUserId();
                    if (!userId) return;
                    setIsCartOpen(false);
                    setConfirmOrderOpen(true);
                  }}
                  className="flex-1 py-2 bg-blue-600 rounded-xl text-white font-semibold"
                >
                  Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR CART MODAL */}
      {confirmClearOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[999]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmClearOpen(false)}
          />

          <div className="relative z-[1000] w-[85%] max-w-sm bg-slate-900 rounded-xl p-5 text-center shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-3">
              Clear Cart?
            </h2>
            <p className="text-white/70 text-sm mb-5">
              Are you sure you want to remove all items?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2 bg-slate-700 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  clearCart();
                  setConfirmClearOpen(false);
                  setIsCartOpen(false);
                }}
                className="flex-1 py-2 bg-red-600 rounded-lg font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ORDER MODAL */}
      {confirmOrderOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[999]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmOrderOpen(false)}
          />

          <div className="relative z-[1000] w-[85%] max-w-sm bg-slate-900 rounded-xl p-5 text-center shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-3">
              Confirm Order
            </h2>
            <p className="text-white/70 text-sm mb-5">
              Are you sure you want to place the order?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOrderOpen(false)}
                className="flex-1 py-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  setConfirmOrderOpen(false);
                  await placeOrder();
                }}
                className="flex-1 py-2 bg-blue-600 rounded-lg font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN LOADING */}
      {placingOrder && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>

          <div className="relative z-50 flex flex-col items-center animate-fadeIn">
            <div className="w-32 h-32 rounded-full border-4 border-blue-500/40 border-t-blue-500 animate-spin"></div>

            <p className="text-white text-xl font-medium mt-6">
              Porosia duke u realizuar...{" "}
              <small>Korieri do ju kontaktoj!</small>
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md"></div>

          <div className="relative z-50 flex flex-col items-center animate-fadeIn">
            <div className="w-40 h-40 rounded-full bg-green-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,100,0.5)] backdrop-blur-xl">
              <div className="text-green-400 text-7xl font-bold animate-pop">
                ✓
              </div>
            </div>

            <p className="text-white text-2xl font-semibold mt-6 animate-fadeInSlow">
              Porosia u krye me sukses!
            </p>
          </div>
        </div>
      )}

      {/* GLOBAL ANIMATIONS */}
      <style jsx global>{`
        @keyframes pop {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          60% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInSlow {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .animate-pop {
          animation: pop 0.4s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-fadeInSlow {
          animation: fadeInSlow 0.8s ease-out 0.2s forwards;
        }

        @keyframes toastEnter {
          0% {
            opacity: 0;
            transform: translate(-50%, -60%) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes toastLeave {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -40%) scale(0.9);
          }
        }

        .animate-enter {
          animation: toastEnter 0.25s ease-out;
        }

        .animate-leave {
          animation: toastLeave 0.25s ease-in forwards;
        }
      `}</style>
    </>
  );
}
