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
    transportationFee,
    totalPrice,
    courierMessage,
    setCourierMessage,
    addItem,
    decreaseItem,
    clearCart,
  } = useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
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
              Nuk u gjet perdoruesi
            </p>
            <p className="text-white/80 text-sm leading-relaxed">
              Nuk u gjet perdoruesi. Ju lutem skenoni QR CODE tuaj personal ose kontakto <br />
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

      const orderPayload: {
        total: number;
        created_at: string;
        user_id: string;
      } = {
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

      // Fetch user profile for name
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

      const userName = userProfile
        ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
        : "Unknown User";

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

      // Send email notification
      try {
        const emailRes = await fetch(
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
              courierMessage,
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
        if (!emailRes.ok) {
          console.error("Email response error:", emailRes.status, await emailRes.text());
        }
      } catch (err) {
        console.error("Email notification failed:", err);
        // Don't block order completion if email fails
      }

      // Send Telegram notification
      try {
        const telegramRes = await fetch("/api/notifications/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName,
            items: cartItems.map(({ product, quantity }) => ({
              name: product.name,
              quantity,
              restaurant_name: product.restaurant_name || null,
            })),
          }),
        });
        if (!telegramRes.ok) {
          console.error("Telegram response error:", telegramRes.status, await telegramRes.text());
        }
      } catch (err) {
        console.error("Telegram notification failed:", err);
        // Don't block order completion if Telegram fails
      }

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
    } catch {
      setPlacingOrder(false);
      toast.error("Unexpected error.");
    }
  }

  /* -------------------------------------------------------
     CART BODY RENDER
  -------------------------------------------------------- */
  const cartBody = (
    <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
      {cartItems.length === 0 && (
        <div className="text-center py-12 text-white/60">
          <div className="text-4xl mb-3">🛒</div>
          <p className="text-sm font-medium">Shporta juaj eshte boshe</p>
          <p className="text-xs text-white/40 mt-1">Filloni shtimin e produkteve</p>
        </div>
      )}

      {cartItems.map(({ product, quantity }) => {
        const price =
          product.is_on_sale && product.sale_price
            ? product.sale_price
            : product.price;
        const itemTotal = price * quantity;
        const originalTotal = product.price * quantity;
        const savings = product.is_on_sale ? originalTotal - itemTotal : 0;

        return (
          <div
            key={`${product.id}-${product.notes ?? ""}`}
            className="bg-slate-800/40 rounded-lg p-3 hover:bg-slate-800/50 transition"
          >
            <div className="flex items-start gap-3">
              <div className="relative w-14 h-14 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {product.image_url?.startsWith("http") && (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                )}
                {(!product.image_url || !product.image_url.startsWith("http")) && product.type === "restaurant" && (
                  <span className="text-2xl">🍔</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{product.name}</p>

                {product.restaurant_name && (
                  <p className="text-xs text-purple-300/80 mt-0.5">📍 {product.restaurant_name}</p>
                )}

                {product.notes && (
                  <p className="text-xs text-blue-300/80 mt-1 line-clamp-1">{product.notes}</p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    {product.is_on_sale && product.sale_price ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-green-400 font-bold text-xs">
                          €{price.toFixed(2)}
                        </span>
                        <span className="text-white/40 text-[10px] line-through">
                          €{product.price.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/70 text-xs">
                        €{price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-bold text-sm">
                    €{itemTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 items-center justify-between mt-2 pt-2">
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={() => decreaseItem(String(product.id))}
                  className="w-7 h-7 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm flex items-center justify-center transition"
                >
                  −
                </button>

                <span className="text-sm font-semibold text-white min-w-[20px] text-center">
                  {quantity}
                </span>

                <button
                  onClick={() => addItem(product, 1, product.notes ?? "")}
                  className="w-7 h-7 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm flex items-center justify-center transition"
                >
                  +
                </button>
              </div>

              {savings > 0 && (
                <span className="text-xs text-green-400 font-medium">
                  -€{savings.toFixed(2)}
                </span>
              )}
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
            className="dg-cart-btn pointer-events-auto w-[85%] py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/40 flex items-center justify-between px-6 active:scale-95 hover:shadow-blue-600/60 transition-all"
          >
            <span className="flex items-center gap-3 text-base font-medium">
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {totalQuantity}
              </span>
              Shikoni porosine
            </span>

            <span className="text-base font-bold text-white">
              €{subtotal.toFixed(2)}
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

          <div className="relative z-10 w-[92%] max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border-2 border-blue-500/40">
            <div className="flex flex-col max-h-[80vh] bg-slate-900">
              <div className="sticky top-0 z-20 flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900">
                <h2 className="text-lg font-bold text-white">🛒 Shporta juaj</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 bg-red-600 hover:bg-red-500 rounded-lg text-white flex items-center justify-center transition font-bold"
                >
                  ✕
                </button>
              </div>

              {cartBody}

              {/* SUMMARY */}
              {hasCart && (
                <>
                  <div className="sticky bottom-0 z-20 mt-4 border-t border-slate-700 pt-4 px-4 pb-4 bg-slate-900 space-y-4">
                    {/* Courier Message */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/80">💬 Mesazh per kurierin</label>
                      <textarea
                        placeholder="P.sh: Mund ta leni pran deres..."
                        value={courierMessage}
                        onChange={(e) => setCourierMessage(e.target.value)}
                        maxLength={200}
                        className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-blue-500 focus:outline-none resize-none text-sm"
                        rows={2}
                      />
                      <p className="text-xs text-white/50 text-right">{courierMessage.length}/200</p>
                    </div>

                    {/* Price Summary */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/70">Subtotal</span>
                        <span className="text-white/70">€{subtotal.toFixed(2)}</span>
                      </div>

                      {restaurantMixFee > 0 && (
                        <div className="flex justify-between items-start text-xs bg-yellow-500/5 border border-yellow-500/30 rounded-lg p-2">
                          <span className="text-yellow-300 flex items-center gap-1.5">
                            <Info size={14} />
                            Tarifa 2 vendesh
                          </span>
                          <span className="text-yellow-300 font-medium">+€{restaurantMixFee.toFixed(2)}</span>
                        </div>
                      )}

                      {transportationFee > 0 && (
                        <div className="flex justify-between items-start text-xs bg-blue-500/5 border border-blue-500/30 rounded-lg p-2 group relative">
                          <span className="text-blue-300 flex items-center gap-1.5">
                            <Info size={14} />
                            Transporti
                          </span>
                          <span className="text-blue-300 font-medium">+€{transportationFee.toFixed(2)}</span>
                          <div className="absolute hidden group-hover:block bottom-full left-0 mb-2 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white/90 whitespace-nowrap shadow-lg z-10">
                            Çmim promocional për tani
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-base font-bold text-white">Total</span>
                        <span className="text-lg font-bold text-blue-400">€{totalPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmClearOpen(true)}
                        className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-lg text-red-400 text-sm font-medium transition"
                      >
                        Fshini
                      </button>

                      <button
                        onClick={() => {
                          if (!requireMinimumTotal()) return;
                          const userId = requireUserId();
                          if (!userId) return;
                          setIsCartOpen(false);
                          placeOrder();
                        }}
                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm font-bold transition active:scale-95"
                      >
                        Porosit
                      </button>
                    </div>
                  </div>
                </>
              )}
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
              Fshini shporten?
            </h2>
            <p className="text-white/70 text-sm mb-5">
              A jeni te sigurte qe doni te fshini shporten?
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
