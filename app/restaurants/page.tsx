"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getRestaurantStatus } from "@/lib/restaurantHours";
import { Search, UtensilsCrossed, Store } from "lucide-react";
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
      <div className="min-h-screen bg-black text-white px-4 sm:px-6 py-10 pb-28">
        <div className="max-w-4xl mx-auto">
          {/* Title Skeleton */}
          <div className="h-9 w-48 bg-slate-800/50 rounded animate-pulse mb-8 mx-auto" />

          {/* Search Bar Skeleton */}
          <div className="h-11 bg-slate-800/50 rounded-lg animate-pulse mb-6" />

          {/* Categories Skeleton */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-slate-800/50 rounded-full animate-pulse flex-shrink-0" />
            ))}
          </div>

          {/* Restaurant Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-900/50 border border-white/10 rounded-lg overflow-hidden">
                {/* Image Skeleton */}
                <div className="aspect-video bg-slate-800/50 animate-pulse" />
                
                {/* Content Skeleton */}
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-slate-800/50 rounded w-32 animate-pulse" />
                  <div className="h-4 bg-slate-800/50 rounded w-full animate-pulse" />
                  <div className="h-4 bg-slate-800/50 rounded w-24 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      {/* Wolt-style header */}
      <div className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kërko restorante..."
              className="w-full h-12 pl-12 pr-4 rounded-full bg-[#222] text-white placeholder-white/70 border border-[#2f2f2f] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 outline-none shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            />
          </div>
          {/* Tabs removed per request */}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

      

        {/* Primary tabs (same placement as products page) */}
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white/80 mb-6">
          {[{ label: "Restoranet", href: "/restaurants", icon: UtensilsCrossed }, { label: "Marketi", href: "/products", icon: Store }].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.href === "/restaurants";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition shadow-sm ${
                  isActive
                    ? "bg-cyan-500 text-black border-cyan-400"
                    : "bg-[#1a1a1a] border-[#2a2a2a] text-white/85 hover:border-cyan-500/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
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
