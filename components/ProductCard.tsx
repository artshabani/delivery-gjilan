"use client";

import Image from "next/image";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useState, useRef } from "react";

interface Props extends Product {
  onClick?: () => void;
  compact?: boolean;
}

export default function ProductCard({
  id,
  name,
  price,
  sale_price,
  is_on_sale,
  image_url,
  onClick,
  compact = false,
}: Props) {
  const { addItem, decreaseItem, items } = useCart();
  const quantity =
    items.find((i) => i.product.id === id)?.quantity || 0;

  const [showControls, setShowControls] = useState(false);
  const [animateQty, setAnimateQty] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null); // podepotest

  const usedPrice = is_on_sale && sale_price ? sale_price : price;
  const validImage =
    image_url?.startsWith("http") ? image_url : "/fallback.jpg";

  /* ---------------- Show/Hide Floating Controls ---------------- */
  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 1100);
  };

  const showInstant = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
  };

  /* ---------------- Cart Actions + Qty Animation ---------------- */
  const inc = () => {
    addItem({ id, name, price, image_url, is_on_sale, sale_price }, 1);

    setAnimateQty(true);
    setTimeout(() => setAnimateQty(false), 250);

    showInstant();
    startHideTimer();
  };

  const dec = () => {
    decreaseItem(String(id));

    if (quantity > 1) {
      setAnimateQty(true);
      setTimeout(() => setAnimateQty(false), 250);
    }

    showInstant();
    startHideTimer();
  };

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden 
                 bg-[#0e0f19] border border-white/10 shadow-md 
                 transition-all duration-300 flex flex-col h-full ${compact ? 'scale-95' : ''}`}
      onMouseEnter={showInstant}
      onMouseLeave={startHideTimer}
      onTouchStart={showInstant}
      onClick={onClick}
    >
      {/* IMAGE */}
      <div className={`relative w-full ${compact ? 'h-[120px]' : 'aspect-square'} rounded-t-2xl overflow-hidden flex-shrink-0`}>
        <Image
          src={validImage}
          alt={name}
          fill
          className="object-cover"
        />

        {/* BUTTON GROUP */}
        <div className="absolute top-0 right-0 z-20">
          {/* ADD BUTTON */}
          {quantity === 0 && (
            <button
              onClick={inc}
              className={`${compact ? 'w-8 h-8 text-base' : 'w-9 h-9 text-lg'} rounded-xl bg-blue-600 text-white 
                         flex items-center justify-center font-bold shadow-lg`}
            >
              +
            </button>
          )}

          {/* STATIC BADGE */}
          {quantity > 0 && !showControls && (
            <div
              className={`${compact ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm'} rounded-xl bg-blue-600 text-white 
                         flex items-center justify-center font-semibold shadow-lg`}
            >
              {quantity}
            </div>
          )}

          {/* CONTROLS */}
          {quantity > 0 && showControls && (
            <div
              className={`flex items-center gap-1 
                         bg-black/60 backdrop-blur-xl 
                         border border-white/10 rounded-xl 
                         ${compact ? 'px-2 py-1.5' : 'px-3 py-2'} shadow-xl`}
            >
              {/* DEC */}
              <button
                onClick={dec}
                className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg bg-blue-600 text-white text-lg 
                           flex items-center justify-center`}
              >
                –
              </button>

              {/* QTY with Animation */}
              <span
                className={`text-white ${compact ? 'text-xs' : 'text-sm'} font-semibold w-5 text-center ${
                  animateQty ? "qty-pop" : ""
                }`}
              >
                {quantity}
              </span>

              {/* INC */}
              <button
                onClick={inc}
                className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg bg-blue-600 text-white text-lg 
                           flex items-center justify-center`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {/* INFO */}
      <div className={`${compact ? 'p-2.5' : 'p-3 sm:p-4'} bg-[#0b0c14] flex flex-col flex-1`}>
        <p className={`text-white font-semibold ${compact ? 'text-xs min-h-[32px]' : 'text-[13px] sm:text-sm min-h-[40px]'} leading-snug line-clamp-2`}>
          {name}
        </p>

        <div className={`${compact ? 'mt-auto pt-2' : 'mt-2'} flex items-center justify-between`}>
          {is_on_sale && sale_price ? (
            <div className="flex items-baseline gap-2">
                <span className={`text-blue-300 font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
                €{sale_price.toFixed(2)}
              </span>
                <span className={`text-red-400 ${compact ? 'text-[10px]' : 'text-xs'} line-through opacity-80`}>
                €{price.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className={`text-blue-400 font-bold ${compact ? 'text-xs' : 'text-sm'}`}>
              €{price.toFixed(2)}
            </span>
          )}

          <button
            onClick={inc}
            className={`${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'} rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-500 active:scale-95`}
          >
            Shto
          </button>
        </div>
      </div>

      
    </div>
  );
}
