"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  categories: any[];
  onClose: () => void;
}

export default function AddProductModal({ categories, onClose }: Props) {
  const [form, setForm] = useState({
    name: "",
    price: "",
    category_id: "",
    image_url: "",
  });

  const [uploading, setUploading] = useState(false);

  const subcategories = categories.filter((c) => c.parent_id !== null);
  const parents = categories.filter((c) => c.parent_id === null);

  // UPLOAD FILE TO S3
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

  const addProduct = async () => {
    await supabase.from("products").insert({
      name: form.name,
      price: Number(form.price),
      category_id: Number(form.category_id),
      image_url: form.image_url,
    });

    onClose();
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

        <input type="file" onChange={onFileChange} />

        {form.image_url && (
          <img
            src={form.image_url}
            className="w-20 h-20 mt-2 object-cover rounded border"
          />
        )}

        <button
          className="w-full bg-green-600 hover:bg-green-500 text-white py-2 rounded"
          onClick={addProduct}
          disabled={uploading}
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
