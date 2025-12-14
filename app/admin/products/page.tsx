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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

    // Category filter
    if (selectedCategory && p.category_id !== selectedCategory) {
      return false;
    }

    // Search filter
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
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-gray-200 p-6 sm:p-8">

      {/* NAVIGATION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <a
          href="/admin/users"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-105"
        >
          <span className="text-xl">👥</span>
          <span>Users</span>
        </a>
        <a
          href="/admin/orders"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105"
        >
          <span className="text-xl">📦</span>
          <span>Orders</span>
        </a>
        <a
          href="/admin/restaurants"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/50 hover:scale-105"
        >
          <span className="text-xl">🍽️</span>
          <span>Restaurants</span>
        </a>
        <a
          href="/admin/analytics"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
        >
          <span className="text-xl">📊</span>
          <span>Analytics</span>
        </a>
        <a
          href="/products"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-emerald-500/50 hover:scale-105"
        >
          <span className="text-xl">🛍️</span>
          <span>Shop</span>
        </a>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">🏷️ Products</h1>
          <p className="text-white/60 text-sm mt-1">Manage store inventory</p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105"
        >
          + Add Product
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="🔍 Search products..."
          className="flex-1 p-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 transition"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        
        <select
          value={selectedCategory || ""}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="p-3 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition cursor-pointer sm:w-64"
        >
          <option value="">All Categories ({products.length})</option>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({count})
              </option>
            );
          })}
        </select>
      </div>

        {/* ITEMS ON SALE CAROUSEL */}
        {products.some((p) => p.is_on_sale && p.sale_price != null) && (
          <div className="mb-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  Items on Sale
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-orange-500/50 to-transparent" />
              <span className="text-sm text-white/60">
                {products.filter((p) => p.is_on_sale).length} items
              </span>
            </div>

            {/* Carousel */}
            <div className="relative -mx-4 px-4">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-4 pb-2">
                  {products
                    .filter((p) => p.is_on_sale && p.sale_price != null)
                    .map((p) => (
                      <div
                        key={`sale-${p.id}`}
                        onClick={() => setShowSale(p)}
                        className="flex-shrink-0 w-[280px] bg-slate-900/50 border border-orange-500/30 rounded-xl p-3 hover:border-orange-500/60 transition cursor-pointer"
                      >
                        <div className="flex gap-3">
                          {/* Image */}
                          <div className="flex-shrink-0">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-slate-700/50 rounded-lg flex items-center justify-center text-white/40 text-xs">
                                No image
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white text-sm truncate mb-1">
                              {p.name}
                            </h4>
                            <p className="text-xs text-white/40 mb-2">
                              {categories.find((c) => c.id === p.category_id)?.name || "No category"}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-green-400">
                                €{Number(p.sale_price).toFixed(2)}
                              </span>
                              <span className="text-sm text-white/40 line-through">
                                €{Number(p.price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSale(p);
                            }}
                            className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition"
                          >
                            Edit Sale
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await supabase
                                .from("products")
                                .update({
                                  is_on_sale: false,
                                  sale_price: null,
                                })
                                .eq("id", p.id);
                              load();
                            }}
                            className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold transition"
                          >
                            Remove Sale
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Gradient fade on edges */}
              <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none" />
              <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none" />
            </div>

            <div className="h-px bg-white/10 mt-4" />
          </div>
        )}

      {/* MOBILE-FRIENDLY PRODUCT CARDS */}
      <div className="space-y-4">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="bg-slate-900/50 border border-white/10 rounded-xl p-4 transition hover:border-blue-500/30"
          >
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="flex-shrink-0">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-700/50 rounded-lg flex items-center justify-center text-white/40">
                    No image
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1 truncate">
                  {p.name}
                </h3>
                
                {/* Category */}
                <p className="text-sm text-white/60 mb-2">
                  {categories.find((c) => c.id === p.category_id)?.name || "No category"}
                </p>

                {/* Price */}
                <div className="mb-3">
                  {p.is_on_sale ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl font-bold text-green-400">
                        €{Number(p.sale_price).toFixed(2)}
                      </span>
                      <span className="text-lg text-white/40 line-through">
                        €{Number(p.price).toFixed(2)}
                      </span>
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-semibold rounded-lg border border-green-500/30">
                        ON SALE
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      €{Number(p.price).toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {/* SALE BUTTON */}
                  {p.is_on_sale ? (
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
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Remove Sale
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSale(p)}
                      className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-semibold transition"
                    >
                      Set Sale
                    </button>
                  )}

                  {/* EDIT BUTTON */}
                  <button
                    onClick={() => setShowEdit(p)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
                  >
                    Edit
                  </button>

                  {/* DELETE */}
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete "${p.name}"?`)) return;
                      
                      await supabase
                        .from("order_items")
                        .delete()
                        .eq("product_id", p.id);

                      await supabase
                        .from("product_store_links")
                        .delete()
                        .eq("product_id", p.id);

                      await supabase
                        .from("products")
                        .delete()
                        .eq("id", p.id);

                      load();
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-white/40">
            No products found
          </div>
        )}
      </div>

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
