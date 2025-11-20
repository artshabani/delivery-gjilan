"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";
import { supabase } from "@/lib/supabase";
import AddProductModal from "@/components/admin/AddProductModal";
import EditProductModal from "@/components/admin/EditProductModal";
import SaleModal from "@/components/admin/SaleModal";

// ---------- Debounce ----------
function useDebounce(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

export default function AdminProductsPage() {
  const guard = useAdminGuard();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [showSale, setShowSale] = useState<any | null>(null);
  const [showEdit, setShowEdit] = useState<any | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  // ---------- LOAD DATA (useCallback FIXES THE useEffect ERROR) ----------
  const load = useCallback(async () => {
    const { data: prod } = await supabase.from("products").select("*");
    const { data: cats } = await supabase.from("product_categories").select("*");
    const { data: storeData } = await supabase.from("stores").select("*");

    setProducts(prod || []);
    setCategories(cats || []);
    setStores(storeData || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- FILTERING ----------
  const filteredProducts = products.filter((p) => {
    const s = debouncedSearch.toLowerCase();
    const cat =
      categories.find((c) => c.id === p.category_id)?.name.toLowerCase() || "";

    return (
      p.name.toLowerCase().includes(s) ||
      String(p.price).includes(s) ||
      cat.includes(s)
    );
  });

  // ---------- GUARD ----------
  if (guard.loading)
    return <p className="p-6 text-gray-200">Checking permission…</p>;
  if (!guard.allowed)
    return (
      <p className="p-6 text-red-400 text-xl font-semibold">Access Denied</p>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-900 text-gray-200">

      {/* NAVIGATION BUTTONS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/admin/users"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition"
        >
          👥 Users Dashboard
        </a>
        <a
          href="/products"
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition"
        >
          🛒 Customer Products Page
        </a>
        <a
          href="/admin/orders"
          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition"
        >
          📦 Orders Dashboard
        </a>
      </div>

      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Products</h1>

        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded"
        >
          + Add Product
        </button>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search products..."
        className="w-full mb-4 p-2 rounded bg-gray-800 border border-gray-700 text-white"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLE */}
      <table className="w-full border border-gray-700 rounded overflow-hidden">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-2 border border-gray-700">Image</th>
            <th className="p-2 border border-gray-700">Name</th>
            <th className="p-2 border border-gray-700">Price</th>
            <th className="p-2 border border-gray-700">Category</th>
            <th className="p-2 border border-gray-700">Sale</th>
            <th className="p-2 border border-gray-700">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredProducts.map((p) => (
            <tr
              key={p.id}
              className="border-t border-gray-700 hover:bg-gray-800/40 transition"
            >
              {/* IMAGE */}
              <td className="p-2 border border-gray-800">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    className="w-14 h-14 rounded object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-700 rounded" />
                )}
              </td>

              {/* NAME */}
              <td className="p-2 border border-gray-800">{p.name}</td>

              {/* PRICE */}
              <td className="p-2 border border-gray-800">
                {p.is_on_sale ? (
                  <div>
                    <p className="text-red-400 font-semibold">
                      €{Number(p.sale_price).toFixed(2)}
                    </p>
                    <p className="text-gray-500 line-through">
                      €{Number(p.price).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <p>€{Number(p.price).toFixed(2)}</p>
                )}
              </td>

              {/* CATEGORY */}
              <td className="p-2 border border-gray-800">
                {categories.find((c) => c.id === p.category_id)?.name || "—"}
              </td>

              {/* SALE STATUS */}
<td className="p-2 border border-gray-800">
  {p.is_on_sale ? (
    <span className="text-green-400 font-semibold">On Sale</span>
  ) : (
    <span className="text-gray-500">—</span>
  )}
</td>

{/* ACTIONS */}
<td className="p-2 border border-gray-800">
  <div className="flex gap-2">

    {/* SALE BUTTON */}
    {p.is_on_sale ? (
      // REMOVE SALE instantly
      <button
        onClick={async () => {
          await supabase
            .from("products")
            .update({
              is_on_sale: false,
              sale_price: null,
            })
            .eq("id", p.id);

          load();
        }}
        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded"
      >
        Remove Sale
      </button>
    ) : (
      // OPEN SALE MODAL
      <button
        onClick={() => setShowSale(p)}
        className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded"
      >
        Sale
      </button>
    )}

    {/* EDIT BUTTON */}
    <button
      onClick={() => setShowEdit(p)}
      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
    >
      Edit
    </button>

    {/* DELETE */}
   <button
  onClick={async () => {
    // 1. delete order items
    await supabase
      .from("order_items")
      .delete()
      .eq("product_id", p.id);

    // 2. delete from the ACTUAL link table
    await supabase
      .from("product_store_links")
      .delete()
      .eq("product_id", p.id);

    // 3. delete product
    await supabase
      .from("products")
      .delete()
      .eq("id", p.id);

    load();
  }}
  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded"
>
  Delete
</button>




  </div>
</td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* MODALS */}
      {showAdd && (
        <AddProductModal
          categories={categories}
          stores={stores}
          onClose={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {showSale && (
        <SaleModal
          product={showSale}
          onClose={() => setShowSale(null)}
          onSaved={load}
        />
      )}

      {showEdit && (
        <EditProductModal
          product={showEdit}
          categories={categories}
          stores={stores}
          onClose={() => {
            setShowEdit(null);
            load();
          }}
        />
      )}

    </div>
  );
}
