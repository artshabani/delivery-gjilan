"use client";

import { useState } from "react";

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
  });

  const [selectedStores, setSelectedStores] = useState<number[]>(
    product.store_ids || []
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSaving(true);

    try {
      const res = await fetch("/api/admin/products/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          ...form,
          price: Number(form.price),
          category_id: Number(form.category_id),
          store_ids: selectedStores,
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
      <div className="bg-gray-800 text-gray-100 p-6 rounded-lg w-96 shadow-xl border border-gray-700 space-y-4">

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
          <p className="text-sm mb-1">Available in stores:</p>

          {stores.map((s: Store) => (
            <label key={s.id} className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                checked={selectedStores.includes(s.id)}
                onChange={(e) =>
                  e.target.checked
                    ? setSelectedStores([...selectedStores, s.id])
                    : setSelectedStores(
                        selectedStores.filter((x) => x !== s.id)
                      )
                }
              />
              {s.name}
            </label>
          ))}
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
