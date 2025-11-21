"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

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
          className="text-3xl font-bold mb-6 text-center"
        >
          Restaurants
        </motion.h1>

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
              className={`rounded-2xl h-28 flex flex-col items-center justify-center border shadow 
                transition bg-slate-900/70 border-slate-800 text-white/80
                ${
                  selectedCategory === cat.label
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg"
                    : "hover:bg-slate-900/90"
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
          {filteredRestaurants.map((r) => (
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className="relative block overflow-hidden rounded-2xl border border-slate-800 
                         bg-slate-900/50 shadow-lg hover:shadow-xl transition transform 
                         hover:-translate-y-0.5"
            >
              <div className="h-48 sm:h-56 w-full overflow-hidden">
                <img
                  src={
                    r.image_url?.startsWith("http") ? r.image_url : "/fallback.jpg"
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
                </div>
              </div>
            </Link>
          ))}

          {filteredRestaurants.length === 0 && (
            <p className="text-center text-white/60 mt-8">No restaurants found.</p>
          )}
        </div>

      </div>
    </div>
  );
}
