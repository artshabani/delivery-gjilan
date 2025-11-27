"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getRestaurantStatus } from "@/lib/restaurantHours";

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categories = [
    { label: "Hamburger", icon: "🍔" },
    { label: "Dyner", icon: "🌯" },
    { label: "Pizza", icon: "🍕" },
    { label: "Restaurant", icon: "🍽️" },

  ];

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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-white/70">Loading restaurants…</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 sm:px-6 py-10">
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
            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold shadow-lg shadow-purple-500/20 transition flex items-center gap-2">
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
              className={`rounded-2xl h-28 flex flex-col items-center justify-center border shadow transition
                ${selectedCategory === cat.label
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/50"
                  : "bg-slate-900/70 border-slate-800 text-white/80 hover:bg-slate-900/90"
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
              className="px-5 py-2 rounded-xl bg-slate-800 border border-slate-700 
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
            placeholder="Search restaurants…"
            className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 
                       text-white placeholder-white/40 shadow focus:outline-none
                       focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {/* RESTAURANTS LIST */}
        <div className="grid grid-cols-1 gap-4 pb-20">
          {filteredRestaurants.map((r) => {
            const status = getRestaurantStatus(r.opens_at, r.closes_at, r.is_open_24_7);

            return (
              <Link
                key={r.id}
                href={`/restaurants/${r.id}`}
                className={`relative block overflow-hidden rounded-2xl border shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 ${status.isOpen
                    ? "border-slate-800 bg-slate-900/50"
                    : "border-slate-800/50 bg-slate-900/30 opacity-75"
                  }`}
              >
                <div className="h-48 sm:h-56 w-full overflow-hidden">
                  <img
                    src={
                      r.image_url && r.image_url.startsWith('http')
                        ? r.image_url
                        : "https://via.placeholder.com/400x300?text=Restaurant"
                    }
                    alt={r.name}
                    className={`w-full h-full object-cover scale-105 ${status.isOpen ? 'blur-sm' : 'blur-sm grayscale'}`}
                  />
                </div>
                <div className={`absolute inset-0 ${status.isOpen ? 'bg-black/50' : 'bg-black/60'}`} />

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md ${status.isOpen
                      ? "bg-green-500/20 border border-green-500/50 text-green-300"
                      : "bg-red-500/20 border border-red-500/50 text-red-300"
                    }`}>
                    {status.isOpen ? "🟢 Open" : "🔴 Closed"}
                  </div>
                </div>

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
            );
          })}

          {filteredRestaurants.length === 0 && (
            <p className="text-center text-white/60 mt-8">No restaurants found.</p>
          )}
        </div>

      </div>
    </div>
  );
}
