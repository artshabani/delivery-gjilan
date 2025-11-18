"use client";

import Image from "next/image";
import { Product } from "@/types/product";
import { useCart } from "@/context/CartContext";
import { useState, useRef } from "react";

interface Props extends Product {}

export default function ProductCard({
  id,
  name,
  price,
  image_url,

}: Props) {
  const { addItem, decreaseItem, items } = useCart();
  const quantity = items.find((i) => i.product.id === id)?.quantity || 0;

  const [showControls, setShowControls] = useState(false);
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  const startHideTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 1100);
  };

  const showInstant = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
  };

  const inc = () => {
    addItem({ id, name, price, image_url});
    showInstant();
    startHideTimer();
  };

  const dec = () => {
    // *** FIX: Ensure the ID is a string when calling decreaseItem ***
    // This resolves the TypeScript error shown in image_fb4720.png 
    decreaseItem(String(id)); 
    showInstant();
    startHideTimer();
  };

  const validImage = image_url?.startsWith("http") ? image_url : "/fallback.jpg";

  return (
    <div
      className="group relative rounded-2xl overflow-hidden 
                 bg-[#0e0f19] border border-white/10 shadow-md 
                 transition-all duration-300"
      onMouseEnter={showInstant}
      onMouseLeave={startHideTimer}
      onTouchStart={showInstant}
    >

      {/* IMAGE SECTION (fills full width & top border) */}
      <div className="relative w-full aspect-square rounded-t-2xl overflow-hidden">
        <Image
          src={validImage || "/placeholder.svg"}
          alt={name}
          fill
          className="object-cover"
        />

        {/* FLOATING BUTTON AREA */}
        <div className="absolute top-0 right-0 z-20 ">

          {/* "+" BUTTON (quantity = 0) */}
          {quantity === 0 && (
            <button
              onClick={inc}
              className="
                w-9 h-9
                rounded-xl bg-blue-600 text-white 
                flex items-center justify-center
                text-lg font-bold
                active:scale-95 transition shadow-lg
              "
            >
              +
            </button>
          )}

          {/* QUANTITY BADGE */}
          {quantity > 0 && !showControls && (
            <div
              className="
                w-9 h-9
                rounded-xl bg-blue-600 text-white 
                flex items-center justify-center
                text-sm font-semibold
                shadow-lg
              "
            >
              {quantity}
            </div>
          )}

          {/* FULL WOLT-STYLE CONTROLS */}
          {quantity > 0 && showControls && (
            <div
              className="
                flex items-center gap-1 
                bg-black/60 backdrop-blur-xl 
                border border-white/10 
                rounded-xl px-3 py-2
                shadow-xl
              "
            >
              {/* - */}
              <button
                onClick={dec}
                className="
                  w-7 h-7 rounded-lg bg-blue-600 text-white text-lg 
                  flex items-center justify-center
                  active:scale-95 transition
                "
              >
                –
              </button>

              {/* qty */}
              <span className="text-white text-sm font-semibold w-5 text-center">
                {quantity}
              </span>

              {/* + */}
              <button
                onClick={inc}
                className="
                  w-7 h-7 rounded-lg bg-blue-600 text-white text-lg 
                  flex items-center justify-center
                  active:scale-95 transition
                "
              >
                +
              </button>
            </div>
          )}

        </div>
      </div>

      {/* BOTTOM INFO */}
      <div className="p-4 bg-[#0b0c14]">
        <p className="text-blue-300 font-semibold text-sm">€{price.toFixed(2)}</p>
        <p className="text-white font-medium text-sm line-clamp-2 mt-1">
          {name}
        </p>
      </div>
    </div>
  );
}
