"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Utensils } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [name, setName] = useState<string | null>(null);

  // Fetch logged-in user's name
  useEffect(() => {
    const loadUser = async () => {
      const uid = localStorage.getItem("dg_user_id");
      if (!uid) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("first_name")
        .eq("id", uid)
        .single();

      if (!error && data?.first_name) {
        setName(data.first_name);
      }
    };

    loadUser();
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 pb-16">

      {/* TITLE */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl font-bold mb-10 text-center"
        style={{ color: "#90FFCC" }}
      >
        {name ? `What do you need today, ${name}?` : "What do you need today?"}
      </motion.h1>

      {/* BUTTONS */}
      <div className="flex flex-col gap-6 w-full max-w-sm">

        {/* GROCERIES */}
        <Link href="/products">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="
              w-full p-6 rounded-2xl border cursor-pointer 
              flex items-center gap-4 transition-shadow

              bg-gradient-to-r from-purple-600/60 to-purple-800/60
              backdrop-blur-xl shadow-lg border-purple-300/20
              hover:shadow-purple-500/40
            "
          >
            <div className="w-14 h-14 bg-black/30 rounded-xl flex items-center justify-center">
              <ShoppingBag size={32} className="text-purple-200" />
            </div>

            <div className="flex flex-col">
              <p className="text-xl font-semibold text-white">Groceries</p>
              <p className="text-sm text-purple-200/70">Snacks, drinks, essentials</p>
            </div>
          </motion.div>
        </Link>

        {/* FOOD */}
        <Link href="/restaurants">
          <motion.div
            whileTap={{ scale: 0.97 }}
            className="
              w-full p-6 rounded-2xl border cursor-pointer 
              flex items-center gap-4 transition-shadow

              bg-gradient-to-r from-blue-600/60 to-blue-800/60
              backdrop-blur-xl shadow-lg border-blue-300/20
              hover:shadow-blue-500/40
            "
          >
            <div className="w-14 h-14 bg-black/30 rounded-xl flex items-center justify-center">
              <Utensils size={32} className="text-blue-200" />
            </div>

            <div className="flex flex-col">
              <p className="text-xl font-semibold text-white">Food</p>
              <p className="text-sm text-blue-200/70">Restaurants & fast food</p>
            </div>
          </motion.div>
        </Link>

      </div>
    </div>
  );
}
