"use client";

import { useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

export default function CartOverlay() {
  const {
    items: cartItems,
    totalQuantity,
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
     PLACE ORDER
  -------------------------------------------------------- */
  async function placeOrder() {
    try {
      toast.dismiss();
      setPlacingOrder(true);

      const orderPayload: any = {
        total: totalPrice,
        created_at: new Date().toISOString(),
      };

      const userId = localStorage.getItem("dg_user_id");
      if (userId) orderPayload.user_id = userId;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (!order || orderErr) {
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
        item_type: product.type,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(itemsPayload);

      if (itemsErr) {
        setPlacingOrder(false);
        toast.error("Failed to add items");
        return;
      }

      // Send email
      await fetch(
        "https://qnwnybyebiczlwxssblx.supabase.co/functions/v1/send-order-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            total: totalPrice,
            userId,
            items: cartItems.map(({ product, quantity }) => ({
              name: product.name,
              quantity,
              price: product.price,
              notes: product.notes || null,
              image_url: product.image_url,
            })),
          }),
        }
      );

      clearCart();
      setPlacingOrder(false);

      // Success popup + confetti
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
     CART BODY
  -------------------------------------------------------- */
  const cartBody = (
    <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
      {cartItems.length === 0 && (
        <p className="text-sm text-white/60">Your cart is empty.</p>
      )}

      {cartItems.map(({ product, quantity }) => {
        const usedPrice =
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

            <span
  className={`text-base font-bold ${
    totalPrice > 3 ? "hot-total" : "text-white"
  }`}
>
  €{totalPrice.toFixed(2)}
</span>

          </button>
        </div>
      )}

      {/* POPUP CART */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="relative z-10 w-[92%] max-w-md cart-border-track-blue">
            <div className="bg-slate-900 rounded-2xl shadow-2xl p-4 flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-white">
                  Your cart
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-7 h-7 bg-slate-800 rounded-full text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {cartBody}

              {/* SUBTOTAL */}
              <div className="mt-4 border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="text-sm font-semibold text-white">
                  Subtotal
                </span>
                <span
  className={`text-base font-bold ${
    totalPrice > 3 ? "hot-total" : "text-white"
  }`}
>
  €{totalPrice.toFixed(2)}
</span>

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

      {/* CONFIRM CLEAR */}
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

      {/* CONFIRM ORDER */}
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
              Porosia duke u realizuar... <small>Korieri do ju kontaktoj!</small>
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

      {/* ANIMATIONS */}
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
      `}</style>
    </>
  );
}
