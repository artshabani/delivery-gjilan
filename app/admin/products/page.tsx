"use client";

import { useState, useEffect } from "react";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";
import ProductTable from "@/components/admin/ProductTable";
import AddProductModal from "@/components/admin/AddProductModal";
import DarkModeToggle from "@/components/ui/DarkModeToggle";
import { supabase } from "@/lib/supabase";

export default function AdminProductsPage() {
  // 🔐 MUST BE FIRST HOOK
  const guard = useAdminGuard();

  // 🔥 ALWAYS RUN HOOKS EVEN IF LOADING
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [refresh, setRefresh] = useState(0);

  // Function to trigger refresh across the application
  const handleProductChange = () => {
    setRefresh((r) => r + 1);
  }

  // LOAD CATEGORIES AND STORES
  useEffect(() => {
    const load = async () => {
      // 1. Fetch Categories
      const { data: catData } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");
        
      // 2. Fetch Stores (needed for the modal)
      const { data: storeData } = await supabase
        .from("stores")
        .select("id, name");

      setCategories(catData || []);
      setStores(storeData || []); 
    };
    load();
  }, []);

  // ------------------------------
  // ONLY RETURN *AFTER* ALL HOOKS
  // ------------------------------

  if (guard.loading) {
    return (
      <div className="p-10 text-center text-lg text-white">
        Checking admin access…
      </div>
    );
  }

  if (!guard.allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-2xl font-bold">
        ⛔ Access denied (Admins only)
      </div>
    );
  }

  // ---------------------
  // RENDER ADMIN PANEL
  // ---------------------
  return (
    <div className="p-6 max-w-6xl mx-auto dark:bg-gray-900 dark:text-gray-200 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products Admin</h1>

        <div className="flex items-center gap-4">
          <DarkModeToggle />

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500"
          >
            + Add Product
          </button>
        </div>
      </div>

      <div className="mb-4">
        <select
          className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories
            .filter((c) => c.parent_id !== null)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      <ProductTable 
        refresh={refresh} // Pass refresh prop
        filterCategory={filterCategory} // Pass filter prop
        onProductChange={handleProductChange} // <-- NEW: Pass the refresh callback
      />


      {showAddModal && (
        <AddProductModal
          categories={categories}
          stores={stores} // Passes the fetched stores
          onClose={() => {
            setShowAddModal(false);
            handleProductChange(); // Use the new handler
          }}
        />
      )}
    </div>
  );
}