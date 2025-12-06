"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

interface Store {
  id: number;
  name: string;
}

interface ProductType {
  id: number;
  name: string;
  price: number;
  category_id: number;
  image_url: string;
  store_ids: number[];
  is_restaurant_extra?: boolean;
  restaurant_price?: number;
}

interface Props {
  product: ProductType;
  categories: Category[];
  stores: Store[];
  onClose: () => void;
}

export default function EditProductModal({
  product,
  categories,
  stores,
  onClose,
}: Props) {

  const [form, setForm] = useState({
    name: product.name,
    price: product.price,
    category_id: product.category_id,
    image_url: product.image_url,
    is_restaurant_extra: product.is_restaurant_extra || false,
    restaurant_price: product.restaurant_price || "",
  });

  const [selectedStores, setSelectedStores] = useState<number[]>(
    product.store_ids || []
  );
  const [wholesalePrices, setWholesalePrices] = useState<Record<number, string>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing wholesale prices
  useEffect(() => {
    const loadWholesalePrices = async () => {
      if (!product.id) return;

      setLoadingPrices(true);
      const { data: costs, error: costsError } = await supabase
        .from("product_store_costs")
        .select("store_id, wholesale_price")
        .eq("product_id", product.id);

      if (!costsError && costs) {
        const pricesMap: Record<number, string> = {};
        costs.forEach((cost) => {
          pricesMap[cost.store_id] = String(cost.wholesale_price);
        });
        setWholesalePrices(pricesMap);
      }
      setLoadingPrices(false);
    };

    loadWholesalePrices();
  }, [product.id]);

  /* ---------- CATEGORY GROUPS ---------- */
  const parents: Category[] = categories.filter(
    (c: Category) => c.parent_id === null
  );

  const subcategories: Category[] = categories.filter(
    (c: Category) => c.parent_id !== null
  );

  /* ---------- IMAGE UPLOAD ---------- */
  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { uploadUrl, publicUrl } = await res.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image to S3");
      }

      setForm((f) => ({ ...f, image_url: publicUrl }));
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  /* ---------- SAVE ---------- */
  const save = async () => {
    setError(null);

    // Validate wholesale prices for all selected stores
    const missingPrices: string[] = [];
    selectedStores.forEach((storeId) => {
      const price = wholesalePrices[storeId];
      if (!price || price === "" || Number(price) <= 0) {
        const storeName = stores.find((s) => s.id === storeId)?.name || `Store ${storeId}`;
        missingPrices.push(storeName);
      }
    });

    if (missingPrices.length > 0) {
      setError(`Please enter wholesale price for: ${missingPrices.join(", ")}`);
      return;
    }

    setSaving(true);

    try {
      // Prepare wholesale prices array
      const storeCosts = selectedStores.map((storeId) => ({
        store_id: storeId,
        wholesale_price: Number(wholesalePrices[storeId]),
      }));

      const res = await fetch("/api/admin/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          ...form,
          price: Number(form.price),
          category_id: Number(form.category_id),
          store_ids: selectedStores,
          store_costs: storeCosts,
          is_restaurant_extra: form.is_restaurant_extra,
          restaurant_price: form.restaurant_price ? Number(form.restaurant_price) : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update product");
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-gray-100 p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto shadow-xl border border-gray-700 space-y-4">

        <h2 className="text-xl font-semibold">Edit Product</h2>

        {/* NAME */}
        <input
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        {/* PRICE */}
        <input
          type="number"
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
        />

        {/* RESTAURANT PRICE */}
        {form.is_restaurant_extra && (
          <input
            type="number"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            placeholder="Restaurant Price (Optional)"
            value={form.restaurant_price}
            onChange={(e) => setForm({ ...form, restaurant_price: e.target.value })}
          />
        )}

        {/* CATEGORIES */}
        <select
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
          value={form.category_id}
          onChange={(e) =>
            setForm({ ...form, category_id: Number(e.target.value) })
          }
        >
          <option value="">Select category…</option>

          {parents.map((p: Category) => (
            <optgroup key={p.id} label={p.name}>
              {subcategories
                .filter((s: Category) => s.parent_id === p.id)
                .map((s: Category) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        {/* STORES */}
        <div>
          <p className="text-sm mb-2 font-semibold">Available in stores:</p>

          {loadingPrices && (
            <p className="text-xs text-gray-400 mb-2">Loading prices...</p>
          )}

          {stores.map((s: Store) => {
            const isSelected = selectedStores.includes(s.id);
            return (
              <div key={s.id} className="mb-3 p-2 bg-gray-700/50 rounded">
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStores([...selectedStores, s.id]);
                        // Initialize wholesale price if not set
                        if (!wholesalePrices[s.id]) {
                          setWholesalePrices({
                            ...wholesalePrices,
                            [s.id]: "",
                          });
                        }
                      } else {
                        setSelectedStores(
                          selectedStores.filter((x) => x !== s.id)
                        );
                        // Keep the price in state but it won't be saved
                      }
                    }}
                  />
                  <span className="font-medium">{s.name}</span>
                </label>
                
                {isSelected && (
                  <div className="ml-6">
                    <label className="text-xs text-gray-400 block mb-1">
                      Wholesale Price (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full p-1.5 bg-gray-800 border border-gray-600 rounded text-sm"
                      placeholder="0.00"
                      value={wholesalePrices[s.id] || ""}
                      onChange={(e) => {
                        setWholesalePrices({
                          ...wholesalePrices,
                          [s.id]: e.target.value,
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* IMAGE UPLOAD */}
        <div>
          <input
            type="file"
            onChange={(e) =>
              e.target.files && uploadImage(e.target.files[0])
            }
            className="text-gray-200"
            disabled={uploading}
          />
          {uploading && (
            <p className="text-sm text-gray-400 mt-1">Uploading image...</p>
          )}
        </div>

        {form.image_url && (
          <img
            src={form.image_url}
            className="w-20 h-20 rounded border border-gray-600 object-cover"
          />
        )}

        {/* RESTAURANT EXTRA CHECKBOX */}
        <label className="flex items-center gap-2 p-2 bg-gray-700/30 rounded cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_restaurant_extra}
            onChange={(e) => setForm({ ...form, is_restaurant_extra: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-200">
            Show in Restaurant Extras (Drinks & Extras)
          </span>
        </label>

        {/* ERROR MESSAGE */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* SAVE */}
        <button
          onClick={save}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={uploading || saving}
        >
          {saving ? "Saving..." : uploading ? "Uploading..." : "Save Changes"}
        </button>

        {/* CANCEL */}
        <button
          onClick={onClose}
          className="w-full text-gray-400 py-1 disabled:opacity-50"
          disabled={uploading || saving}
        >
          Cancel
        </button>

      </div>
    </div>
  );
}
