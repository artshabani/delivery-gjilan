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
  const [restaurantItems, setRestaurantItems] = useState<Record<number, any[]>>({});
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
      item?: any;
    }
  >(null);

  const [restForm, setRestForm] = useState({
    name: "",
    description: "",
    image_url: "",
    category: "",
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
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
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
      setRestForm({ name: "", description: "", image_url: "", category: "" });
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

  const openCreateModal = () => {
    setRestForm({ name: "", description: "", image_url: "", category: "" });
    setModal({ type: "create", restaurant: null });
  };

  const openEditModal = (r: Restaurant) => {
    setRestForm({
      name: r.name,
      description: r.description || "",
      image_url: r.image_url || "",
      category: r.category || "",
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

  const openEditItemModal = (r: Restaurant, item: any) => {
    setItemForm({
      restaurant_id: r.id,
      name: item.name,
      price: String(item.price),
      description: item.description || "",
      image_url: item.image_url || "",
    });
    setModal({ type: "item-edit", restaurant: r, item });
  };

  const openDeleteItemModal = (r: Restaurant, item: any) => {
    setModal({ type: "item-delete", restaurant: r, item });
  };

  if (loading) return <p className="p-6 text-white">Loading...</p>;

  const filteredRestaurants = restaurants.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white px-4 sm:px-8 py-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-white/60 uppercase tracking-wide">Admin</p>
          <h1 className="text-4xl font-bold text-purple-300">Restaurants</h1>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold shadow-lg"
        >
          <Plus size={18} /> Add Restaurant
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search restaurants..."
          className="w-full p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-white"
        />
      </div>

      {/* TABLE */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">

        {/* HEADER */}
        <div className="hidden md:grid grid-cols-[1.2fr,2fr,2fr,1.6fr] px-4 py-3 text-sm uppercase tracking-wide text-white/70 border-b border-slate-800">
          <span>Restaurant</span>
          <span>Description</span>
          <span>Category</span>
          <span className="text-right">Actions</span>
        </div>

        {/* LIST */}
        <div className="divide-y divide-slate-800">
          {filteredRestaurants.map((r) => {
            const cat = CATEGORY_OPTIONS.find((c) => c.value === r.category);

            return (
              <div
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-[1.2fr,2fr,2fr,1.6fr] gap-3 px-4 py-4 hover:bg-slate-900/60 transition"
              >
                {/* Restaurant */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden border border-slate-700 flex-shrink-0">
                    <Image
                      src={r.image_url?.startsWith("http") ? r.image_url : "/fallback.jpg"}
                      alt={r.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg leading-tight">{r.name}</p>
                    <p className="text-xs text-white/60">ID: {r.id}</p>
                  </div>
                </div>

                {/* Description */}
                <div className="text-white/80 text-sm md:pr-4">
                  {r.description || "—"}
                </div>

                {/* Category */}
                <div className="flex items-center">
                  {cat ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-800 text-sm">
                      {cat.label}
                    </span>
                  ) : (
                    <span className="text-white/60 text-sm">Uncategorized</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap md:justify-end gap-2">
                  <button
                    onClick={() => openEditModal(r)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
                  >
                    <Pencil size={16} /> Edit
                  </button>

                  <button
                    onClick={() => openAddItemModal(r)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm"
                  >
                    <UtensilsCrossed size={16} /> Add Item
                  </button>

                  <button
                    onClick={() => openDeleteModal(r)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-sm"
                  >
                    <Trash2 size={16} /> Delete
                  </button>

                  <button
                    onClick={() => {
                      setExpanded((prev) => ({ ...prev, [r.id]: !prev[r.id] }));
                      if (!restaurantItems[r.id]) loadItemsForRestaurant(r.id);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm border border-slate-700"
                  >
                    {expanded[r.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {expanded[r.id] ? "Hide Items" : "Show Items"}
                  </button>
                </div>

                {/* ITEMS EXPANDED SECTION */}
                {expanded[r.id] && (
                  <div className="md:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 mt-2">
                    {itemsLoading[r.id] && (
                      <p className="text-sm text-white/70">Loading items…</p>
                    )}

                    {!itemsLoading[r.id] &&
                      (restaurantItems[r.id] || []).length === 0 && (
                        <p className="text-sm text-white/60">No items yet.</p>
                      )}

                    <div className="space-y-2">
                      {(restaurantItems[r.id] || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-lg bg-slate-900/50 border border-slate-800 px-3 py-2"
                        >
                          <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-white/70 text-sm">
                              €{item.price}
                              {item.description ? ` · ${item.description}` : ""}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditItemModal(r, item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs"
                            >
                              <Edit size={14} /> Edit
                            </button>

                            <button
                              onClick={() => openDeleteItemModal(r, item)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredRestaurants.length === 0 && (
            <p className="text-center text-white/60 px-4 py-10">
              No restaurants found.
            </p>
          )}
        </div>
      </div>

      {/* MODALS */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">

            {/* HEADER */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {modal.type === "create" && "Add Restaurant"}
                {modal.type === "edit" &&
                  `Edit ${modal.restaurant?.name}`}
                {modal.type === "add-item" && "Add Item"}
                {modal.type === "delete" &&
                  `Delete ${modal.restaurant?.name}?`}
              </h3>

              <button
                onClick={() => setModal(null)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* CREATE / EDIT */}
            {(modal.type === "create" || modal.type === "edit") && (
              <>
                <label className="text-sm text-white/70">Name</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={restForm.name}
                  onChange={(e) =>
                    setRestForm({ ...restForm, name: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Category</label>
                <select
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
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

                <label className="text-sm text-white/70">Description</label>
                <textarea
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  rows={3}
                  value={restForm.description}
                  onChange={(e) =>
                    setRestForm({ ...restForm, description: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files?.[0] && uploadImage(e.target.files[0])
                  }
                  disabled={uploading}
                  className="text-sm text-white"
                />

                {restForm.image_url && (
                  <div className="w-24 h-24 relative rounded overflow-hidden border border-slate-700">
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

                <button
                  onClick={
                    modal.type === "create"
                      ? addRestaurant
                      : updateRestaurant
                  }
                  disabled={creating}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold"
                >
                  {creating ? "Saving..." : "Save"}
                </button>
              </>
            )}

            {/* ADD ITEM */}
            {modal.type === "add-item" && (
              <>
                <label className="text-sm text-white/70">Name</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Price (€)</label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Description</label>
                <textarea
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Image URL</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.image_url}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, image_url: e.target.value })
                  }
                />

                <button
                  onClick={addItem}
                  disabled={creating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg font-semibold"
                >
                  {creating ? "Saving..." : "Add Item"}
                </button>
              </>
            )}

            {/* EDIT ITEM */}
            {modal.type === "item-edit" && (
              <>
                <label className="text-sm text-white/70">Name</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Price (€)</label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Description</label>
                <textarea
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                />

                <label className="text-sm text-white/70">Image URL</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.image_url}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, image_url: e.target.value })
                  }
                />

                <button
                  onClick={updateItem}
                  disabled={creating}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold"
                >
                  {creating ? "Saving..." : "Update Item"}
                </button>
              </>
            )}

            {/* DELETE ITEM */}
            {modal.type === "item-delete" && modal.restaurant && modal.item && (
              <div className="space-y-3">
                <p className="text-white/80">
                  Delete item{" "}
                  <span className="font-semibold">{modal.item.name}</span> from{" "}
                  <span className="font-semibold">{modal.restaurant.name}</span>?
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() =>
                      deleteItem(modal.item.id, modal.restaurant?.id ?? 0)
                    }
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* DELETE RESTAURANT */}
            {modal.type === "delete" && modal.restaurant && (
              <div className="space-y-3">
                <p className="text-white/80">
                  Delete restaurant{" "}
                  <span className="font-semibold">{modal.restaurant.name}</span>?
                  This action removes all its items.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-2 rounded-lg border border-slate-700 bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => deleteRestaurant(modal.restaurant?.id ?? 0)}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
