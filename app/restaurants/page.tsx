"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ALTERNATING GRADIENTS (same style as home buttons)
  const gradients = [
    "from-purple-600/60 to-purple-800/60 border-purple-400/20 backdrop-blur-xl",
    "from-blue-600/60 to-blue-800/60 border-blue-400/20 backdrop-blur-xl"
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

  if (loading) return <p className="p-6 text-white">Loading...</p>;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10 max-w-xl mx-auto">

      {/* PAGE TITLE — Mint green */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl font-bold mb-8 text-center"
        style={{ color: "#90FFCC" }}
      >
        Restaurants
      </motion.h1>

      {/* LIST OF RESTAURANTS */}
      <div className="flex flex-col gap-6 pb-20">
        {restaurants.map((r, i) => {
          const gradient = gradients[i % gradients.length];

          return (
            <Link
              key={r.id}
              href={`/restaurants/${r.id}`}
              className={`
                w-full p-6 rounded-2xl border cursor-pointer 
                flex flex-col justify-center transition-shadow

                bg-gradient-to-r ${gradient}
                shadow-lg hover:shadow-2xl
              `}
            >
              {/* NAME */}
              <p className="text-xl font-semibold text-white text-center">
                {r.name}
              </p>

              {/* DESCRIPTION */}
              {r.description && (
                <p className="text-sm text-white/80 text-center mt-1">
                  {r.description}
                </p>
              )}
            </Link>
          );
        })}

        {restaurants.length === 0 && (
          <p className="text-center text-white/40">No restaurants found.</p>
        )}
      </div>
    </div>
  );
}
