"use client";

import { useState } from "react";
// Removed unused import: import { supabase } from "@/lib/supabase"; 

interface Store {
    id: number;
    name: string;
}

interface Props {
  categories: any[];
  stores: Store[]; // Accepts the list of stores
  onClose: () => void;
}

export default function AddProductModal({ categories, stores, onClose }: Props) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category_id: "",
    image_url: "",
  });

  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]); // State for selected stores
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subcategories = categories.filter((c) => c.parent_id !== null);
  const parents = categories.filter((c) => c.parent_id === null);

  // --- HANDLERS ---

  // Handle store checkbox changes
  const handleStoreChange = (storeId: number, isChecked: boolean) => {
    setSelectedStoreIds(prev => 
      isChecked
        ? [...prev, storeId] // Add ID if checked
        : prev.filter(id => id !== storeId) // Remove ID if unchecked
    );
  };

  // UPLOAD FILE TO S3 (same as original)
  const uploadImage = async (file: File) => {
    setUploading(true);

    const res = await fetch("/api/admin/products/sign-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || "image/jpeg",
      }),
    });

    const { uploadUrl, publicUrl } = await res.json();

    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "image/jpeg" },
      body: file,
    });

    setForm((f) => ({ ...f, image_url: publicUrl }));
    setUploading(false);
  };

  const onFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
  };

  // MODIFIED: Use API route instead of direct Supabase call
  const addProduct = async () => {
    setError(null);
    if (selectedStoreIds.length === 0) {
        setError("You must select at least one store.");
        return;
    }

    const payload = {
        name: form.name,
        price: Number(form.price),
        category_id: Number(form.category_id),
        image_url: form.image_url,
        store_ids: selectedStoreIds, // PASS THE STORE IDS TO THE API
        in_stock: true 
    };

    try {
        const res = await fetch("/api/admin/products/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (!res.ok) {
            setError(result.error || "Failed to add product and link to stores.");
            return;
        }

        onClose(); // Close and refresh parent table
    } catch (err) {
        setError("Network error occurred during submission.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-96 space-y-3 shadow-xl">
        <h2 className="text-xl font-semibold mb-2">Add Product</h2>

        <input
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          placeholder="Price"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        {/* Grouped category selector */}
        <select
          className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          value={form.category_id}
          onChange={(e) =>
            setForm({ ...form, category_id: e.target.value })
          }
        >
          <option value="">Select Subcategory…</option>

          {parents.map((p) => (
            <optgroup key={p.id} label={p.name}>
              {subcategories
                .filter((s) => s.parent_id === p.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        
        {/* Store Selection Checkboxes */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Available at Stores
            </label>
            <div className="space-y-1">
                {stores.map(store => (
                    <div key={store.id} className="flex items-center">
                        <input
                            id={`store-${store.id}`}
                            type="checkbox"
                            checked={selectedStoreIds.includes(store.id)}
                            onChange={(e) => handleStoreChange(store.id, e.target.checked)}
                            className="h-4 w-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500"
                        />
                        <label htmlFor={`store-${store.id}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            {store.name}
                        </label>
                    </div>
                ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <input type="file" onChange={onFileChange} />

        {form.image_url && (
          <img
            src={form.image_url}
            className="w-20 h-20 mt-2 object-cover rounded border"
            alt="Uploaded Product Preview"
          />
        )}

        <button
          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded disabled:opacity-50"
          onClick={addProduct}
          disabled={uploading || selectedStoreIds.length === 0 || !form.name || !form.price || !form.category_id}
        >
          {uploading ? "Uploading..." : "Add Product"}
        </button>

        <button
          className="w-full py-2 rounded text-gray-700 dark:text-gray-300"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}