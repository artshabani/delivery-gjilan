"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  product: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function SaleModal({ product, onClose, onSaved }: Props) {
  const [salePrice, setSalePrice] = useState(
    product.is_on_sale ? product.sale_price : ""
  );

  const price = Number(product.price);
  const sale = Number(salePrice);

  const discountPercent =
    salePrice && sale < price ? (((price - sale) / price) * 100).toFixed(1) : null;

  const updateSale = async () => {
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

  const removeSale = async () => {
    await supabase
      .from("products")
      .update({
        is_on_sale: false,
        sale_price: null,
      })
      .eq("id", product.id);

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-96 shadow-xl space-y-4">
        <h2 className="text-xl font-semibold">Set Sale Price</h2>

        <div className="border dark:border-gray-700 p-3 rounded">
          <p className="font-medium">{product.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Regular price: €{price.toFixed(2)}
          </p>

          {product.is_on_sale && (
            <p className="text-sm text-red-500 font-medium">
              Current sale: €{product.sale_price.toFixed(2)}
            </p>
          )}
        </div>

        <input
          type="number"
          placeholder="Sale price"
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
        />

        {discountPercent && (
          <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/40 border dark:border-blue-700">
            <p className="text-gray-800 dark:text-gray-200">
              New price: <span className="font-semibold">€{sale.toFixed(2)}</span>
            </p>
            <p className="text-green-600 dark:text-green-400 font-semibold">
              Discount: {discountPercent}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You save €{(price - sale).toFixed(2)}
            </p>
          </div>
        )}

        <button
          onClick={updateSale}
          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded"
        >
          Save Sale
        </button>

        {product.is_on_sale && (
          <button
            onClick={removeSale}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded"
          >
            Remove Sale
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 rounded text-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
