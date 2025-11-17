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

  async function load() {
    try {
      const rest = await fetch(`/api/admin/restaurants/get/${restaurantId}`);
      const itemsRes = await fetch(
        `/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`
      );

      const restData = await rest.json();
      const itemsData = await itemsRes.json();

      setRestaurant(restData.restaurant);
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
    const name = prompt("New name:", restaurant.name);
    if (!name) return;

    const description = prompt(
      "New description:",
      restaurant.description || ""
    );
    const image = prompt("New image URL:", restaurant.image_url || "");

    const res = await fetch(`/api/admin/restaurants/update/${restaurantId}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        image_url: image,
      }),
    });

    if (res.ok) {
      toast.success("Restaurant updated!");
      load();
    } else {
      toast.error("Failed to update restaurant");
    }
  }

  async function addItem() {
    const name = prompt("Item name?");
    if (!name) return;

    const price = Number(prompt("Price?"));
    const description = prompt("Description?") || "";
    const image_url = prompt("Image URL?") || "";

    const res = await fetch(`/api/admin/restaurants/items/create`, {
      method: "POST",
      body: JSON.stringify({
        restaurant_id: restaurantId,
        name,
        price,
        description,
        image_url,
      }),
    });

    if (res.ok) {
      toast.success("Item added!");
      load();
    } else {
      toast.error("Failed to add item");
    }
  }

  async function deleteItem(itemId: number) {
    if (!confirm("Delete this item?")) return;

    const res = await fetch(`/api/admin/restaurants/items/delete/${itemId}`, {
      method: "DELETE",
    });

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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-purple-400">
          {restaurant.name}
        </h1>

        <button
          onClick={updateRestaurant}
          className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Pencil size={18} />
        </button>
      </div>

      <p className="text-white/70">{restaurant.description}</p>

      <div className="flex justify-end">
        <button
          onClick={addItem}
          className="bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
        >
          <Plus size={18} /> Add Item
        </button>
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
              className="bg-red-600 p-2 rounded-lg hover:bg-red-700"
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
