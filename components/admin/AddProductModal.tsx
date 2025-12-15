"use client";

import { useState } from "react";

interface Store {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

interface Props {
  categories: Category[];
  stores: Store[];
  onClose: () => void;
}

export default function AddProductModal({ categories, stores, onClose }: Props) {
  const [form, setForm] = useState({
    name: "",
    price: "1",
    restaurant_price: "",
    category_id: "",
    image_url: "",
    is_restaurant_extra: false,
  });

  // Check first store by default
  const [selectedStores, setSelectedStores] = useState<number[]>(
    stores.length > 0 ? [stores[0].id] : []
  );
  const [wholesalePrices, setWholesalePrices] = useState<Record<number, string>>(
    stores.length > 0 ? { [stores[0].id]: "1" } : {}
  );
  const [keepOpen, setKeepOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parents: Category[] = categories.filter((c) => c.parent_id === null);
  const subcategories: Category[] = categories.filter((c) => c.parent_id !== null);

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

  const create = async () => {
    setError(null);

    if (!form.name || !form.price || !form.category_id) {
      setError("All fields are required.");
      return;
    }

    if (selectedStores.length === 0) {
      setError("Choose at least one store.");
      return;
    }

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

    setCreating(true);

    try {
      // Prepare wholesale prices array
      const storeCosts = selectedStores.map((storeId) => ({
        store_id: storeId,
        wholesale_price: Number(wholesalePrices[storeId]),
      }));

      const res = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          category_id: Number(form.category_id),
          store_ids: selectedStores,
          store_costs: storeCosts,
          in_stock: true,
          is_restaurant_extra: form.is_restaurant_extra,
          restaurant_price: form.restaurant_price ? Number(form.restaurant_price) : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create product");
      }

      if (!keepOpen) {
        onClose();
      } else {
        // Reset only name and image, keep other values
        setForm({
          ...form,
          name: "",
          image_url: "",
        });
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-slate-900 text-white border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <p className="text-sm text-white/50">Create new product</p>
            <h2 className="text-2xl font-bold">Add Product</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 hover:border-white/30 flex items-center justify-center text-xl"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-white/80">Name</span>
              <input
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-white/80">Category</span>
              <select
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Select category…</option>
                {parents.map((parent: Category) => (
                  <optgroup key={parent.id} label={parent.name}>
                    {subcategories
                      .filter((sub: Category) => sub.parent_id === parent.id)
                      .map((sub: Category) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-white/80">Price (€)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-white/80">Extras visibility</span>
              <div className="p-3 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-between">
                <span className="text-sm text-white/70">Show in restaurant extras</span>
                <input
                  type="checkbox"
                  checked={form.is_restaurant_extra}
                  onChange={(e) => setForm({ ...form, is_restaurant_extra: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-500 bg-slate-900"
                />
              </div>

              {form.is_restaurant_extra && (
                <div className="pt-2">
                  <label className="text-xs text-white/50 block mb-2">Restaurant Price (€) - Optional</label>
                  <input
                    type="number"
                    className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="0.00"
                    value={form.restaurant_price}
                    onChange={(e) => setForm({ ...form, restaurant_price: e.target.value })}
                  />
                </div>
              )}
            </label>
          </div>

          {/* Image upload */}
          <div className="grid grid-cols-1 md:grid-cols-[160px,1fr] gap-4 items-center">
            <div className="aspect-square w-full max-w-[160px] bg-slate-800 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
              {form.image_url ? (
                <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-sm">No image</span>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-sm font-semibold text-white/80">Image</span>
              <label className="block">
                <input
                  type="file"
                  className="w-full text-sm text-white/80 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files) uploadImage(e.target.files[0]);
                  }}
                  disabled={uploading}
                />
              </label>
              {uploading && <p className="text-xs text-white/50">Uploading image...</p>}
            </div>
          </div>

          {/* Stores and wholesale */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Stores & wholesale</p>
              <span className="text-xs text-white/50">Select stores and enter wholesale price</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stores.map((store: Store) => {
                const isSelected = selectedStores.includes(store.id);
                return (
                  <div key={store.id} className="p-3 rounded-lg bg-slate-800 border border-white/10">
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStores([...selectedStores, store.id]);
                            if (!wholesalePrices[store.id]) {
                              setWholesalePrices({
                                ...wholesalePrices,
                                [store.id]: "",
                              });
                            }
                          } else {
                            setSelectedStores(selectedStores.filter((id) => id !== store.id));
                            const newPrices = { ...wholesalePrices };
                            delete newPrices[store.id];
                            setWholesalePrices(newPrices);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-500 bg-slate-900"
                      />
                      <span className="font-semibold text-white">{store.name}</span>
                    </label>

                    {isSelected && (
                      <div className="space-y-1">
                        <label className="text-xs text-white/50">Wholesale price (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full p-2 bg-slate-900 border border-white/10 rounded-lg text-sm"
                          placeholder="0.00"
                          value={wholesalePrices[store.id] || ""}
                          onChange={(e) => {
                            setWholesalePrices({
                              ...wholesalePrices,
                              [store.id]: e.target.value,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Keep open toggle */}
          <label className="flex items-center gap-2 p-3 rounded-lg bg-slate-800 border border-white/10 hover:border-white/20 transition cursor-pointer">
            <input
              type="checkbox"
              checked={keepOpen}
              onChange={(e) => setKeepOpen(e.target.checked)}
              className="w-4 h-4 rounded border-gray-500 bg-slate-900"
            />
            <span className="text-sm font-medium text-white/80">Do not close the window after adding</span>
          </label>

          {/* Error */}
          {error && <div className="p-3 rounded-lg bg-red-600/20 border border-red-500/40 text-sm text-red-200">{error}</div>}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="sm:w-auto w-full px-4 py-3 rounded-lg border border-white/10 text-white hover:bg-white/5 transition"
              disabled={uploading || creating}
            >
              Cancel
            </button>
            <button
              onClick={create}
              className="sm:w-auto w-full px-5 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold shadow-lg shadow-green-600/30 disabled:opacity-60"
              disabled={uploading || creating}
            >
              {creating ? "Creating..." : uploading ? "Uploading..." : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
