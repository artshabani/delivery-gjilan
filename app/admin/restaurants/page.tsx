"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
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

  async function load() {
    const res = await fetch("/api/admin/restaurants/list");
    const { restaurants } = await res.json();
    setRestaurants(restaurants);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addRestaurant() {
    const name = prompt("Restaurant name?");
    if (!name) return;

    const description = prompt("Description (optional):") || "";
    const image_url = prompt("Image URL (optional):") || "";

    const res = await fetch("/api/admin/restaurants/create", {
      method: "POST",
      body: JSON.stringify({ name, description, image_url }),
    });

    if (res.ok) {
      toast.success("Restaurant added!");
      load();
    } else {
      toast.error("Failed to add restaurant");
    }
  }

  async function deleteRestaurant(id: number) {
    if (!confirm("Delete this restaurant?")) return;

    const res = await fetch(`/api/admin/restaurants/delete/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Restaurant deleted!");
      load();
    } else {
      toast.error("Failed to delete restaurant");
    }
  }

  if (loading) return <p className="p-6 text-white">Loading...</p>;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-400">Restaurants</h1>

        <button
          onClick={addRestaurant}
          className="bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2 text-white hover:bg-purple-700"
        >
          <Plus size={18} /> Add
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {restaurants.map((r) => (
          <div
            key={r.id}
            className="bg-slate-900 rounded-xl p-4 border border-purple-500/20 flex items-center justify-between"
          >
            <div>
              <h2 className="text-xl font-semibold">{r.name}</h2>
              <p className="text-white/60 text-sm">{r.description || "—"}</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                href={`/admin/restaurants/${r.id}`}
              >
                <Pencil size={18} />
              </Link>

              <button
                onClick={() => deleteRestaurant(r.id)}
                className="p-2 bg-red-600 rounded-lg hover:bg-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {restaurants.length === 0 && (
          <p className="text-center text-white/60">No restaurants found.</p>
        )}
      </div>
    </div>
  );
}
