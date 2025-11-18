"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SaleModal({ product, onClose, onSaved }) {
  const [salePrice, setSalePrice] = useState(product.sale_price || "");

  const save = async () => {
    await supabase
      .from("products")
      .update({
        is_on_sale: true,
        sale_price: Number(salePrice),
      })
      .eq("id", product.id);

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-gray-100 p-6 rounded-lg w-96 border border-gray-700 shadow-xl space-y-4">

        <h2 className="text-xl font-semibold">Set Sale Price</h2>

        <p className="text-gray-300">Regular price: €{product.price}</p>

        <input
          type="number"
          placeholder="Sale price"
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
        />

        <button
          onClick={save}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded"
        >
          Save Sale
        </button>

        <button onClick={onClose} className="w-full text-gray-400 py-1">
          Cancel
        </button>
      </div>
    </div>
  );
}
