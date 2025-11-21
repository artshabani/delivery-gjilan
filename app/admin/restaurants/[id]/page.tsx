"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const restaurantId = Number(id);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRest, setSavingRest] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const [restForm, setRestForm] = useState({
    name: "",
    description: "",
    image_url: "",
  });

  const [itemForm, setItemForm] = useState({
    name: "",
    price: "",
    description: "",
    image_url: "",
  });

  async function load() {
    try {
      const rest = await fetch(`/api/admin/restaurants/get/${restaurantId}`);
      const itemsRes = await fetch(
        `/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`
      );

      const restData = await rest.json();
      const itemsData = await itemsRes.json();

      setRestaurant(restData.restaurant);
      setRestForm({
        name: restData.restaurant?.name || "",
        description: restData.restaurant?.description || "",
        image_url: restData.restaurant?.image_url || "",
      });
      setItems(itemsData.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [restaurantId]);

  async function updateRestaurant() {
    if (!restForm.name) {
      toast.error("Name is required");
      return;
    }
    setSavingRest(true);
    const res = await fetch(`/api/admin/restaurants/update/${restaurantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restForm),
    });

    if (res.ok) {
      toast.success("Restaurant updated!");
      load();
    } else {
      toast.error("Failed to update restaurant");
    }
    setSavingRest(false);
  }

  async function addItem() {
    if (!itemForm.name || !itemForm.price) {
      toast.error("Name and price are required");
      return;
    }
    setAddingItem(true);

    const res = await fetch(`/api/admin/restaurants/items/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        name: itemForm.name,
        price: Number(itemForm.price),
        description: itemForm.description,
        image_url: itemForm.image_url,
      }),
    });

    if (res.ok) {
      toast.success("Item added!");
      setItemForm({ name: "", price: "", description: "", image_url: "" });
      load();
    } else {
      toast.error("Failed to add item");
    }
    setAddingItem(false);
  }

  async function deleteItem(itemId: number) {
    setDeletingItemId(itemId);
    const res = await fetch(`/api/admin/restaurants/items/delete/${itemId}`, {
      method: "DELETE",
    });

    setDeletingItemId(null);
    if (res.ok) {
      toast.success("Item deleted!");
      load();
    } else {
      toast.error("Failed to delete item");
    }
  }

  if (loading) return <p className="p-6 text-white">Loading...</p>;

  if (!restaurant)
    return (
      <p className="p-6 text-red-400 font-semibold">Restaurant not found.</p>
    );

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 max-w-xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-purple-400">
            Edit Restaurant
          </h1>
          <button
            onClick={updateRestaurant}
            disabled={savingRest}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60"
          >
            <Pencil size={16} />
            {savingRest ? "Saving…" : "Save"}
          </button>
        </div>

        <label className="text-sm text-white/70">Name</label>
        <input
          className="w-full p-2 rounded bg-slate-800 border border-slate-700"
          value={restForm.name}
          onChange={(e) => setRestForm({ ...restForm, name: e.target.value })}
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

        <label className="text-sm text-white/70">Image URL</label>
        <input
          className="w-full p-2 rounded bg-slate-800 border border-slate-700"
          value={restForm.image_url}
          onChange={(e) =>
            setRestForm({ ...restForm, image_url: e.target.value })
          }
        />
      </div>

      <div className="bg-slate-900 border border-purple-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus size={18} /> Add Item
          </h2>
          <button
            onClick={addItem}
            disabled={addingItem}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-60"
          >
            {addingItem ? "Adding…" : "Add"}
          </button>
        </div>

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
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 p-4 rounded-xl border border-purple-500/10 flex justify-between"
          >
            <div>
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-white/60">{item.description}</p>
              <p className="font-bold mt-1">{item.price}€</p>
            </div>

            <button
              onClick={() => deleteItem(item.id)}
              disabled={deletingItemId === item.id}
              className="bg-red-600 p-2 rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-white/60 text-center">
            This restaurant has no items yet.
          </p>
        )}
      </div>
    </div>
  );
}
