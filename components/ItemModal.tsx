"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";

export default function ItemModal({ item, onClose }: any) {
  const { addItem } = useCart();
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  function handleAdd() {
    addItem(
      { ...item, notes },
      quantity,
      notes
    );
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md 
                 flex items-center justify-center px-5"
    >
      {/* CARD */}
      <div
        className="w-full max-w-sm bg-white/10 border border-white/10 
                   rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative 
                   animate-[fadeIn_0.25s]"
      >
        {/* CLOSE BUTTON */}
        <button
          className="absolute right-5 top-5 z-20 text-white/70 hover:text-white"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        {/* TITLE + PRICE */}
        <div className="text-center mb-4 mt-2">
          <h2 className="text-xl font-semibold text-white">{item.name}</h2>
          <p className="text-lg font-bold text-purple-300 mt-1">
            €{item.price}
          </p>

          {item.description && (
            <p className="text-white/60 text-sm mt-2 leading-relaxed px-2">
              {item.description}
            </p>
          )}
        </div>

        {/* NOTES INPUT */}
        <textarea
          className="w-full mt-4 p-3 bg-white/5 rounded-xl text-white 
                     placeholder-white/40 border border-white/10 
                     focus:border-mint-300 outline-none resize-none"
          placeholder="Notes (optional)…"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* QUANTITY SELECTOR */}
        <div className="flex items-center justify-between mt-5">
          <span className="text-white font-medium text-lg">Quantity</span>

          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 
                          rounded-xl border border-white/10">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 bg-black/30 rounded-lg text-white text-xl 
                         flex items-center justify-center active:scale-95"
            >
              –
            </button>

            <span className="text-white text-lg font-semibold w-8 text-center">
              {quantity}
            </span>

            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 bg-black/30 rounded-lg text-white text-xl 
                         flex items-center justify-center active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* ADD BUTTON */}
        <button
          onClick={handleAdd}
          className="w-full mt-6 py-3 bg-purple-600 hover:bg-purple-700 
                     text-white font-semibold rounded-xl text-lg 
                     active:scale-95 transition"
        >
          Add to cart · {(item.price * quantity).toFixed(2)}€
        </button>
      </div>
    </div>
  );
}
