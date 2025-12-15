"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Pencil,
  UtensilsCrossed,
  ChevronDown,
  ChevronRight,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";

interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  opens_at?: string;
  closes_at?: string;
  is_open_24_7?: boolean;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}

const CATEGORY_OPTIONS = [
  { value: "Restaurant", label: "🍽️ Restaurant" },
  { value: "Hamburger", label: "🍔 Hamburger" },
  { value: "Dyner", label: "🌯 Dyner" },
  { value: "Pizza", label: "🍕 Pizza" },
];

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [restaurantItems, setRestaurantItems] = useState<Record<number, MenuItem[]>>({});
  const [itemsLoading, setItemsLoading] = useState<Record<number, boolean>>({});
  const [modal, setModal] = useState<
    | null
    | {
      type:
      | "create"
      | "edit"
      | "add-item"
      | "delete"
      | "item-edit"
      | "item-delete";
      restaurant: Restaurant | null;
      item?: MenuItem;
    }
  >(null);

  const [restForm, setRestForm] = useState({
    name: "",
    description: "",
    image_url: "",
    category: "",
    opens_at: "",
    closes_at: "",
    is_open_24_7: false,
  });

  const [itemForm, setItemForm] = useState({
    restaurant_id: 0,
    name: "",
    price: "",
    description: "",
    image_url: "",
  });

  async function load() {
    const res = await fetch("/api/admin/restaurants/list");
    const { restaurants } = await res.json();
    setRestaurants(restaurants);
    setLoading(false);
  }

  async function loadItemsForRestaurant(id: number) {
    setItemsLoading((prev) => ({ ...prev, [id]: true }));
    const res = await fetch(`/api/admin/restaurants/items/list?restaurant_id=${id}`);
    const data = await res.json();
    setRestaurantItems((prev) => ({ ...prev, [id]: data.items || [] }));
    setItemsLoading((prev) => ({ ...prev, [id]: false }));
  }

  useEffect(() => {
    load();
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const res = await fetch("/api/admin/restaurants/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      const { uploadUrl, publicUrl } = await res.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      setRestForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function addRestaurant() {
    if (!restForm.name || !restForm.category) {
      toast.error("Name and category required");
      return;
    }

    setCreating(true);

    const res = await fetch("/api/admin/restaurants/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restForm),
    });

    if (res.ok) {
      toast.success("Restaurant added!");
      setRestForm({ name: "", description: "", image_url: "", category: "", opens_at: "", closes_at: "", is_open_24_7: false });
      setModal(null);
      load();
    } else toast.error("Failed to add restaurant");

    setCreating(false);
  }

  async function updateRestaurant() {
    if (!modal?.restaurant) return;
    if (!restForm.name || !restForm.category) {
      toast.error("Name + category required");
      return;
    }

    setCreating(true);

    const res = await fetch(`/api/admin/restaurants/update/${modal.restaurant.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restForm),
    });

    if (res.ok) {
      toast.success("Restaurant updated!");
      setModal(null);
      load();
    } else toast.error("Failed to update restaurant");

    setCreating(false);
  }

  async function addItem() {
    if (!itemForm.name || !itemForm.price) {
      toast.error("Name & price required");
      return;
    }

    setCreating(true);

    const res = await fetch(`/api/admin/restaurants/items/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...itemForm,
        price: Number(itemForm.price),
      }),
    });

    if (res.ok) {
      toast.success("Item added!");
      setModal(null);
      setItemForm({
        restaurant_id: 0,
        name: "",
        price: "",
        description: "",
        image_url: "",
      });
      load();
    } else toast.error("Failed to add item");

    setCreating(false);
  }

  async function updateItem() {
    if (!modal?.item) return;

    setCreating(true);

    const res = await fetch(`/api/admin/restaurants/items/update/${modal.item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: itemForm.name,
        price: Number(itemForm.price),
        description: itemForm.description,
        image_url: itemForm.image_url,
      }),
    });

    if (res.ok) {
      toast.success("Item updated!");
      setModal(null);
      loadItemsForRestaurant(itemForm.restaurant_id);
    } else toast.error("Failed to update item");

    setCreating(false);
  }

  async function deleteItem(itemId: number, restaurantId: number) {
    const res = await fetch(`/api/admin/restaurants/items/delete/${itemId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Item deleted!");
      setModal(null);
      loadItemsForRestaurant(restaurantId);
    } else {
      // Extract the error message from the 400 response body for better feedback
      const errorData = await res.json();
      toast.error(errorData.error || "Failed to delete item (unknown reason)");
    }
  }

  async function deleteRestaurant(id: number) {
    const res = await fetch(`/api/admin/restaurants/delete/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Restaurant deleted!");
      setModal(null);
      load();
    } else toast.error("Failed to delete restaurant");
  }

  async function migrateAllSections() {
    const confirmed = confirm(
      "This will migrate all orphaned sections for ALL restaurants. Continue?"
    );

    if (!confirmed) return;

    const toastId = toast.loading("Migrating sections for all restaurants...");

    try {
      const res = await fetch("/api/admin/restaurants/sections/migrate-all", {
        method: "POST",
      });

      const data = await res.json();

      toast.dismiss(toastId);

      if (res.ok) {
        toast.success(
          `Successfully migrated ${data.totalMigrated} section(s) across ${data.results.length} restaurant(s)!`
        );
      } else {
        toast.error(data.error || "Failed to migrate sections");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Error migrating sections");
      console.error(err);
    }
  }

  const openCreateModal = () => {
    setRestForm({ name: "", description: "", image_url: "", category: "", opens_at: "", closes_at: "", is_open_24_7: false });
    setModal({ type: "create", restaurant: null });
  };

  const openEditModal = (r: Restaurant) => {
    setRestForm({
      name: r.name,
      description: r.description || "",
      image_url: r.image_url || "",
      category: r.category || "",
      opens_at: r.opens_at || "",
      closes_at: r.closes_at || "",
      is_open_24_7: r.is_open_24_7 || false,
    });
    setModal({ type: "edit", restaurant: r });
  };

  const openAddItemModal = (r: Restaurant) => {
    setItemForm({
      restaurant_id: r.id,
      name: "",
      price: "",
      description: "",
      image_url: "",
    });
    setModal({ type: "add-item", restaurant: r });
  };

  const openDeleteModal = (r: Restaurant) => {
    setModal({ type: "delete", restaurant: r });
  };

  const openEditItemModal = (r: Restaurant, item: MenuItem) => {
    setItemForm({
      restaurant_id: r.id,
      name: item.name,
      price: String(item.price),
      description: item.description || "",
      image_url: item.image_url || "",
    });
    setModal({ type: "item-edit", restaurant: r, item });
  };

  const openDeleteItemModal = (r: Restaurant, item: MenuItem) => {
    setModal({ type: "item-delete", restaurant: r, item });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-gray-200 p-6 sm:p-8">
        {/* Navigation Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-10 w-48 bg-slate-800/50 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-800/50 rounded animate-pulse" />
        </div>

        {/* Search & Button Skeleton */}
        <div className="mb-8 flex gap-3">
          <div className="flex-1 h-10 bg-slate-800/50 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Restaurant Cards Skeleton */}
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/40 border border-white/10 rounded-xl overflow-hidden p-4">
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-slate-800/50 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 bg-slate-800/50 rounded w-48 animate-pulse" />
                  <div className="h-4 bg-slate-800/50 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-800/50 rounded w-64 animate-pulse" />
                  <div className="flex gap-2 mt-4 pt-2">
                    <div className="h-8 w-20 bg-slate-800/50 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-slate-800/50 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <UtensilsCrossed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Restaurant Management
              </h1>
              <p className="text-white/60 text-sm mt-0.5">Manage locations, menus and items</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={openCreateModal}
              className="group relative overflow-hidden px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <div className="relative flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                <span>Add Restaurant</span>
              </div>
            </button>

            <button
              onClick={migrateAllSections}
              className="px-5 py-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 hover:border-amber-600/60 font-semibold text-amber-300 transition-all duration-300"
            >
              <div className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Migrate Sections</span>
              </div>
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants by name..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 text-white placeholder-white/40 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* RESTAURANTS GRID */}
        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800/50">
            <UtensilsCrossed className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No restaurants found</p>
            <p className="text-white/40 text-sm mt-2">Try adjusting your search or add a new restaurant</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRestaurants.map((r) => {
              const cat = CATEGORY_OPTIONS.find((c) => c.value === r.category);

              return (
                <div
                  key={r.id}
                  className="group relative bg-gradient-to-br from-slate-900/90 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 hover:border-purple-500/30 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
                >
                  {/* Card Content */}
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex gap-4 mb-4">
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-700/50 flex-shrink-0 shadow-xl">
                        <Image
                          src={r.image_url?.startsWith("http") ? r.image_url : "/fallback.jpg"}
                          alt={r.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white mb-1 truncate">{r.name}</h3>
                        {cat && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-sm font-medium mb-2">
                            {cat.label}
                          </span>
                        )}
                        <p className="text-white/60 text-xs mt-1">ID: {r.id}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {r.description && (
                      <p className="text-white/70 text-sm mb-4 line-clamp-2">{r.description}</p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditModal(r)}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-sm font-medium transition-all hover:scale-[1.02]"
                      >
                        <Pencil size={16} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => openAddItemModal(r)}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-sm font-medium transition-all hover:scale-[1.02]"
                      >
                        <Plus size={16} />
                        <span>Add Item</span>
                      </button>

                      <button
                        onClick={() => openDeleteModal(r)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-sm font-medium transition-all hover:scale-[1.02]"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => {
                          setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }));
                          if (!restaurantItems[r.id]) loadItemsForRestaurant(r.id);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-sm font-medium transition-all hover:scale-[1.02]"
                      >
                        {expanded[r.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>

                    {/* ITEMS EXPANDED SECTION */}
                    {expanded[r.id] && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                          <UtensilsCrossed size={16} className="text-purple-400" />
                          Menu Items
                        </h4>
                        
                        {itemsLoading[r.id] && (
                          <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
                          </div>
                        )}

                        {!itemsLoading[r.id] && (restaurantItems[r.id] || []).length === 0 && (
                          <p className="text-white/50 text-sm text-center py-6 bg-slate-800/30 rounded-lg">No items yet</p>
                        )}

                        <div className="space-y-2">
                          {(restaurantItems[r.id] || []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all group/item"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white text-sm truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-emerald-400 font-semibold text-sm">€{Number(item.price).toFixed(2)}</span>
                                  {item.description && (
                                    <span className="text-white/50 text-xs truncate">{item.description}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditItemModal(r, item)}
                                  className="p-2 rounded-md bg-blue-600/80 hover:bg-blue-600 transition-colors"
                                  title="Edit item"
                                >
                                  <Edit size={14} />
                                </button>

                                <button
                                  onClick={() => openDeleteItemModal(r, item)}
                                  className="p-2 rounded-md bg-red-600/80 hover:bg-red-600 transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center px-4 py-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-900/95 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            
            {/* HEADER */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm p-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {modal.type === "create" && "Add Restaurant"}
                  {modal.type === "edit" && `Edit ${modal.restaurant?.name}`}
                  {modal.type === "add-item" && `Add Menu Item`}
                  {modal.type === "item-edit" && "Edit Menu Item"}
                  {modal.type === "delete" && `Delete Restaurant`}
                  {modal.type === "item-delete" && "Delete Menu Item"}
                </h3>

                <button
                  onClick={() => setModal(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">

            {/* CREATE / EDIT */}
            {(modal.type === "create" || modal.type === "edit") && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Restaurant Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition"
                    placeholder="Enter restaurant name"
                    value={restForm.name}
                    onChange={(e) =>
                      setRestForm({ ...restForm, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Category *</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white focus:border-blue-500/50 focus:outline-none transition"
                    value={restForm.category}
                    onChange={(e) =>
                      setRestForm({ ...restForm, category: e.target.value })
                    }
                  >
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition resize-none"
                    placeholder="Brief description of the restaurant"
                    rows={3}
                    value={restForm.description}
                    onChange={(e) =>
                      setRestForm({ ...restForm, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Restaurant Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      e.target.files?.[0] && uploadImage(e.target.files[0])
                    }
                    disabled={uploading}
                    className="w-full text-sm text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer disabled:opacity-50"
                  />

                  {restForm.image_url && (
                    <div className="w-24 h-24 relative rounded overflow-hidden border border-slate-700 mt-3">
                      <Image
                        src={
                          restForm.image_url.startsWith("http")
                            ? restForm.image_url
                            : "/fallback.jpg"
                        }
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Working Hours Section */}
                <div className="pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3">Working Hours</h3>

                  {/* 24/7 Checkbox */}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restForm.is_open_24_7}
                      onChange={(e) =>
                        setRestForm({ ...restForm, is_open_24_7: e.target.checked })
                      }
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                    />
                    <span className="text-sm text-white/70">Open 24/7</span>
                  </label>

                  {/* Time Inputs */}
                  {!restForm.is_open_24_7 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-white/70">Opens At</label>
                        <input
                          type="time"
                          className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                          value={restForm.opens_at}
                          onChange={(e) =>
                            setRestForm({ ...restForm, opens_at: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm text-white/70">Closes At</label>
                        <input
                          type="time"
                          className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                          value={restForm.closes_at}
                          onChange={(e) =>
                            setRestForm({ ...restForm, closes_at: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={
                    modal.type === "create"
                      ? addRestaurant
                      : updateRestaurant
                  }
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 py-2.5 rounded-lg font-semibold transition"
                >
                  {creating ? "Saving..." : modal.type === "create" ? "Create Restaurant" : "Save Changes"}
                </button>
              </div>
            )}

            {/* ADD ITEM */}
            {modal.type === "add-item" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Item Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition"
                    placeholder="e.g., Margherita Pizza"
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Price (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition"
                    placeholder="0.00"
                    value={itemForm.price}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, price: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Description (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition resize-none"
                    placeholder="Add item details, ingredients, etc."
                    rows={2}
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Image URL (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition font-mono text-sm"
                    placeholder="https://example.com/item.jpg"
                    value={itemForm.image_url}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, image_url: e.target.value })
                    }
                  />
                </div>

                <button
                  onClick={addItem}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-600 disabled:to-slate-600 py-2.5 rounded-lg font-semibold transition"
                >
                  {creating ? "Saving..." : "Add Item"}
                </button>
              </div>
            )}

            {/* EDIT ITEM */}
            {modal.type === "item-edit" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Item Name *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition"
                    placeholder="e.g., Margherita Pizza"
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Price (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition"
                    placeholder="0.00"
                    value={itemForm.price}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, price: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Description (Optional)</label>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition resize-none"
                    placeholder="Add item details, ingredients, etc."
                    rows={2}
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Image URL (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-md bg-slate-800/50 border border-slate-700/50 text-white placeholder-white/30 focus:border-blue-500/50 focus:outline-none transition font-mono text-sm"
                    placeholder="https://example.com/item.jpg"
                    value={itemForm.image_url}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, image_url: e.target.value })
                    }
                  />
                </div>

                <button
                  onClick={updateItem}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 py-2.5 rounded-lg font-semibold transition"
                >
                  {creating ? "Saving..." : "Update Item"}
                </button>
              </div>
            )}

            {/* DELETE ITEM */}
            {modal.type === "item-delete" && modal.restaurant && modal.item && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/30">
                  <p className="text-white/90 text-center">
                    Are you sure you want to delete <span className="font-bold text-red-400">{modal.item.name}</span> from <span className="font-semibold text-white">{modal.restaurant.name}</span>?
                  </p>
                  <p className="text-white/60 text-sm text-center mt-2">This action cannot be undone.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 font-medium transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => modal.item && deleteItem(modal.item.id, modal.restaurant?.id ?? 0)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-semibold shadow-lg shadow-red-900/30 transition-all"
                  >
                    Delete Item
                  </button>
                </div>
              </div>
            )}

            {/* DELETE RESTAURANT */}
            {modal.type === "delete" && modal.restaurant && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/30">
                  <p className="text-white/90 text-center">
                    Are you sure you want to delete <span className="font-bold text-red-400">{modal.restaurant.name}</span>?
                  </p>
                  <p className="text-white/60 text-sm text-center mt-2">This will permanently remove the restaurant and all its menu items.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 font-medium transition-all"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => deleteRestaurant(modal.restaurant?.id ?? 0)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-semibold shadow-lg shadow-red-900/30 transition-all"
                  >
                    Delete Restaurant
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
