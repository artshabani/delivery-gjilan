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
    price: "",
    category_id: "",
    image_url: "",
  });

  const [selectedStores, setSelectedStores] = useState<number[]>([]);
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

    setCreating(true);

    try {
      const res = await fetch("/api/admin/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          category_id: Number(form.category_id),
          store_ids: selectedStores,
          in_stock: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create product");
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 text-gray-100 p-6 rounded-lg shadow-xl w-96 space-y-4 border border-gray-700">

        <h2 className="text-xl font-semibold">Add Product</h2>

        {/* NAME */}
        <input
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        {/* PRICE */}
        <input
          type="number"
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
          placeholder="Price"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />

        {/* CATEGORIES */}
        <select
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded"
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

        {/* STORES */}
        <div className="pt-2 border-t border-gray-700">
          <p className="text-sm font-semibold mb-2">Available in Stores</p>

          {stores.map((store: Store) => (
            <label key={store.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={selectedStores.includes(store.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedStores([...selectedStores, store.id]);
                  } else {
                    setSelectedStores(
                      selectedStores.filter((id) => id !== store.id)
                    );
                  }
                }}
              />
              {store.name}
            </label>
          ))}
        </div>

        {/* IMAGE UPLOAD */}
        <div>
          <input
            type="file"
            className="text-gray-200"
            onChange={(e) => {
              if (e.target.files) uploadImage(e.target.files[0]);
            }}
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

        {/* ERROR MESSAGE */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* ADD BUTTON */}
        <button
          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={create}
          disabled={uploading || creating}
        >
          {creating ? "Creating..." : uploading ? "Uploading..." : "Add Product"}
        </button>

        <button
          className="w-full text-gray-300 py-2 disabled:opacity-50"
          onClick={onClose}
          disabled={uploading || creating}
        >
          Cancel
        </button>

      </div>
    </div>
  );
}
