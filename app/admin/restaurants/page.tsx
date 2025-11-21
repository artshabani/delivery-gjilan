"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
}

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [restaurantItems, setRestaurantItems] = useState<
    Record<number, any[]>
  >({});
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
    const res = await fetch(
      `/api/admin/restaurants/items/list?restaurant_id=${id}`
    );
    const data = await res.json();
    setRestaurantItems((prev) => ({ ...prev, [id]: data.items || [] }));
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

      setRestForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function addRestaurant() {
    if (!restForm.name) {
      toast.error("Name is required");
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
      setRestForm({ name: "", description: "", image_url: "" });
      setModal(null);
      load();
    } else {
      toast.error("Failed to add restaurant");
    }

    setCreating(false);
  }

  async function updateRestaurant() {
    if (!restForm.name || !modal?.restaurant) {
      toast.error("Name is required");
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
    } else {
      toast.error("Failed to update restaurant");
    }

    setCreating(false);
  }

  async function addItem() {
    if (!itemForm.name || !itemForm.price || !itemForm.restaurant_id) {
      toast.error("Name, price and restaurant are required");
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
    } else {
      toast.error("Failed to add item");
    }
    setCreating(false);
  }

  async function updateItem() {
    if (!itemForm.name || !itemForm.price || !itemForm.restaurant_id || !modal?.item) {
      toast.error("Name, price and restaurant are required");
      return;
    }
    setCreating(true);

    const res = await fetch(
      `/api/admin/restaurants/items/update/${modal.item.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemForm.name,
          price: Number(itemForm.price),
          description: itemForm.description,
          image_url: itemForm.image_url,
        }),
      }
    );

    if (res.ok) {
      toast.success("Item updated!");
      setModal(null);
      if (itemForm.restaurant_id) {
        loadItemsForRestaurant(itemForm.restaurant_id);
      }
    } else {
      toast.error("Failed to update item");
    }
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
      toast.error("Failed to delete item");
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
    } else {
      toast.error("Failed to delete restaurant");
    }
  }

  const openCreateModal = () => {
    setRestForm({ name: "", description: "", image_url: "" });
    setModal({ type: "create", restaurant: null });
  };

  const openEditModal = (r: Restaurant) => {
    setRestForm({
      name: r.name,
      description: r.description || "",
      image_url: r.image_url || "",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white px-4 sm:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <p className="text-sm text-white/60 uppercase tracking-wide">Admin</p>
          <h1 className="text-4xl font-bold text-purple-300">Restaurants</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
          >
            Products
          </Link>
          <Link
            href="/admin/orders"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm"
          >
            Orders
          </Link>
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm"
          >
            Users
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 font-semibold shadow-lg"
          >
            <Plus size={18} /> Add Restaurant
          </button>
        </div>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {restaurants.map((r) => (
          <div
            key={r.id}
            className="bg-slate-900/80 backdrop-blur-lg rounded-2xl p-5 border border-purple-500/20 shadow-xl flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 relative">
                <Image
                  src={
                    r.image_url?.startsWith("http") ? r.image_url : "/fallback.jpg"
                  }
                  alt={r.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{r.name}</h2>
                <p className="text-white/70 text-sm line-clamp-2">
                  {r.description || "—"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
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
                  setExpanded((prev) => {
                    const next = { ...prev, [r.id]: !prev[r.id] };
                    return next;
                  });
                  if (!restaurantItems[r.id]) {
                    loadItemsForRestaurant(r.id);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-sm border border-slate-700"
              >
                {expanded[r.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                {expanded[r.id] ? "Hide Items" : "Show Items"}
              </button>
            </div>

            {expanded[r.id] && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 space-y-2">
                {(restaurantItems[r.id] || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-slate-900/40 px-3 py-2"
                  >
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-white/70 text-sm">
                        €{item.price} {item.description ? `· ${item.description}` : ""}
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

                {(restaurantItems[r.id] || []).length === 0 && (
                  <p className="text-white/60 text-sm">No items yet.</p>
                )}
              </div>
            )}
          </div>
        ))}

        {restaurants.length === 0 && (
          <p className="text-center text-white/60">No restaurants found.</p>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {modal.type === "create" && "Add Restaurant"}
                {modal.type === "edit" && `Edit ${modal.restaurant?.name}`}
                {modal.type === "add-item" && `Add Item to ${modal.restaurant?.name}`}
                {modal.type === "delete" && `Delete ${modal.restaurant?.name}?`}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

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
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) uploadImage(e.target.files[0]);
                    }}
                    disabled={uploading}
                    className="text-sm text-white"
                  />
                  {uploading && (
                    <span className="text-xs text-white/60">Uploading...</span>
                  )}
                </div>

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
                  onClick={modal.type === "create" ? addRestaurant : updateRestaurant}
                  disabled={creating}
                  className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold disabled:opacity-60"
                >
                  {creating ? "Saving..." : "Save"}
                </button>
              </>
            )}

                {modal.type === "add-item" && (
              <>
                <label className="text-sm text-white/70">Name</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />

                <label className="text-sm text-white/70">Price (€)</label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded-lg font-semibold disabled:opacity-60"
                >
                  {creating ? "Saving..." : "Add Item"}
                </button>
              </>
            )}

            {modal.type === "item-edit" && (
              <>
                <label className="text-sm text-white/70">Name</label>
                <input
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />

                <label className="text-sm text-white/70">Price (€)</label>
                <input
                  type="number"
                  className="w-full p-2 rounded bg-slate-800 border border-slate-700"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
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
                  className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg font-semibold disabled:opacity-60"
                >
                  {creating ? "Saving..." : "Update Item"}
                </button>
              </>
            )}

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
                    className="flex-1 py-2 rounded-lg border border-slate-700 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      deleteItem(modal.item.id, modal.restaurant!.id)
                    }
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {modal.type === "delete" && modal.restaurant && (
              <div className="space-y-3">
                <p className="text-white/80">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{modal.restaurant.name}</span>?
                  This will also remove its items.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModal(null)}
                    className="flex-1 py-2 rounded-lg border border-slate-700 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteRestaurant(modal.restaurant!.id)}
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
