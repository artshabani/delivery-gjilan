"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getRestaurantStatus } from "@/lib/restaurantHours";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";
import toast from "react-hot-toast";
import { SortableItem } from "@/components/SortableItem";

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { allowed: isAdmin } = useAdminGuard();

  const categories = [
    { label: "Hamburger", icon: "🍔" },
    { label: "Dyner", icon: "🌯" },
    { label: "Pizza", icon: "🍕" },
    { label: "Restaurant", icon: "🍽️" },

  ];

  // Get default image based on category
  const getCategoryImage = (category: string | null, restaurantId: number) => {
    const categoryImages: Record<string, string[]> = {
      "Hamburger": [
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=600&fit=crop",
      ],
      "Dyner": [
        "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&h=600&fit=crop",
      ],
      "Pizza": [
        "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
      ],
      "Restaurant": [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop",
      ],
    };
    
    const images = category && categoryImages[category] 
      ? categoryImages[category] 
      : categoryImages["Restaurant"];
    
    // Use restaurant ID to cycle through images
    return images[restaurantId % images.length];
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/restaurants/list");
        const { restaurants } = await res.json();
        setRestaurants(restaurants || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = restaurants.findIndex((r) => r.id === active.id);
    const newIndex = restaurants.findIndex((r) => r.id === over.id);

    const newOrder = arrayMove(restaurants, oldIndex, newIndex);

    // Update UI immediately
    setRestaurants(newOrder);

    // Prepare order data with new sort_order values
    const orderData = newOrder.map((restaurant, index) => ({
      id: restaurant.id,
      sort_order: index,
    }));

    // Send to backend
    try {
      const res = await fetch("/api/admin/restaurants/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderData }),
      });

      if (res.ok) {
        toast.success("Restaurant order updated!");
      } else {
        toast.error("Failed to update order");
        // Reload to get correct order
        const reloadRes = await fetch("/api/admin/restaurants/list");
        const { restaurants } = await reloadRes.json();
        setRestaurants(restaurants || []);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Error updating order");
    }
  }

  // APPLY FILTERS
  const filteredRestaurants = restaurants
    .filter((r) =>
      selectedCategory ? r.category === selectedCategory : true
    )
    .filter((r) =>
      search.trim() === ""
        ? true
        : r.name.toLowerCase().includes(search.toLowerCase())
    );

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/70">Loading restaurants…</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 py-10 pb-28">
      <div className="max-w-4xl mx-auto">

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-bold mb-4 text-center"
        >
          Restaurants
        </motion.h1>

        {/* Browse Groceries Button */}
        <div className="flex justify-center mb-6">
          <Link href="/products">
            <button className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition flex items-center gap-2">
              <span>🛒</span>
              Browse Groceries
            </button>
          </Link>
        </div>

        {/* CATEGORY FILTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === cat.label ? null : cat.label
                )
              }
              className={`rounded-lg h-28 flex flex-col items-center justify-center border shadow transition
                ${selectedCategory === cat.label
                  ? "bg-blue-600 text-white border-blue-500 shadow"
                  : "bg-slate-800/60 border-slate-700 text-white/80 hover:bg-slate-700"
                }`}
            >
              <div className="text-3xl">{cat.icon}</div>
              <p className="text-sm font-semibold mt-1">{cat.label}</p>
            </button>
          ))}
        </div>

        {/* ALL BUTTON – ONLY SHOW WHEN A FILTER IS ACTIVE */}
        {selectedCategory && (
          <div className="flex justify-center mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-5 py-2 rounded-lg bg-slate-800/60 border border-slate-700 
                         hover:bg-slate-700 text-white text-sm font-semibold shadow
                         transition"
            >
              Shfaq te gjitha ✨
            </button>
          </div>
        )}

        {/* SEARCH BAR BELOW CATEGORIES */}
        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kerko restaurante…"
            className="w-full h-11 sm:h-12 px-4 sm:px-5 rounded-xl bg-slate-900/70 border border-blue-600 
                       text-white placeholder-white/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none transition"
          />
        </div>

        {/* RESTAURANTS LIST */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredRestaurants
              .filter((r) => {
                const status = getRestaurantStatus(r.opens_at, r.closes_at, r.is_open_24_7);
                return status.isOpen;
              })
              .map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 pb-20">
              {filteredRestaurants
                .filter((r) => {
                  const status = getRestaurantStatus(r.opens_at, r.closes_at, r.is_open_24_7);
                  return status.isOpen;
                })
                .map((r) => {
                  const status = getRestaurantStatus(r.opens_at, r.closes_at, r.is_open_24_7);

                  return (
                    <SortableItem key={r.id} id={r.id} disabled={!isAdmin}>
                      <Link
                        href={`/restaurants/${r.id}`}
                        className="relative block overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/30 shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5"
                      >
                        {isAdmin && (
                          <div className="absolute top-4 left-4 z-10 bg-purple-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-white border border-purple-500/50">
                            ⋮⋮ Drag to reorder
                          </div>
                        )}
                        <div className="h-48 sm:h-56 w-full overflow-hidden">
                          <img
                            src={
                              r.image_url && r.image_url.startsWith('http')
                                ? r.image_url
                                : getCategoryImage(r.category, r.id)
                            }
                            alt={r.name}
                            className="w-full h-full object-cover scale-105 blur-sm"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50" />

                        <div className="absolute inset-0 flex items-center justify-center px-4">
                          <div className="text-center">
                            <p className="text-2xl sm:text-3xl font-semibold drop-shadow">
                              {r.name}
                            </p>
                            {r.description && (
                              <p className="text-base sm:text-lg text-white/90 mt-2 drop-shadow">
                                {r.description}
                              </p>
                            )}
                            {/* Hours Info */}
                            <p className={`text-sm mt-2 font-medium ${status.statusColor} drop-shadow`}>
                              {status.statusText}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </SortableItem>
                  );
                })}

              {filteredRestaurants.filter((r) => {
                const status = getRestaurantStatus(r.opens_at, r.closes_at, r.is_open_24_7);
                return status.isOpen;
              }).length === 0 && (
                  <p className="text-center text-white/60 mt-8">No open restaurants found.</p>
                )}
            </div>
          </SortableContext>
        </DndContext>

      </div>
    </div>
  );
}
