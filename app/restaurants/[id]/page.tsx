"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

// ✨ MATCH HOME PAGE GRADIENTS + BLUR
const gradients = [
  "from-purple-600/60 to-purple-800/60 border-purple-400/20 backdrop-blur-xl",
  "from-blue-600/60 to-blue-800/60 border-blue-400/20 backdrop-blur-xl"
];

export default function RestaurantDetail() {
  const { id } = useParams();
  const restaurantId = Number(id);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { addItem } = useCart();

  useEffect(() => {
    async function load() {
      try {
        const restRes = await fetch(`/api/admin/restaurants/get/${restaurantId}`);
        const itemsRes = await fetch(
          `/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`
        );

        const restData = await restRes.json();
        const itemsData = await itemsRes.json();

        setRestaurant(restData.restaurant || null);
        setItems(itemsData.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [restaurantId]);

  if (loading) return <p className="p-6 text-white">Loading...</p>;
  if (!restaurant)
    return <p className="p-6 text-red-400 font-semibold">Restaurant not found.</p>;

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10 max-w-xl mx-auto">

      {/* TITLE */}
      <motion.h1
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-3xl font-bold text-center mb-4"
        style={{ color: "#f472b6" }} // 🌸 PINK TITLE
      >
        {restaurant.name}
      </motion.h1>

      {/* DESCRIPTION */}
      {restaurant.description && (
        <p className="text-white/70 text-center mb-10 px-4">{restaurant.description}</p>
      )}

      {/* MENU TITLE */}
      <h2 className="text-2xl font-semibold text-mint-300 mb-4">Menu</h2>

      {/* MENU ITEMS */}
      <div className="space-y-6 pb-24">
        {items.map((item, i) => {
          const gradient = gradients[i % gradients.length];

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`
                w-full p-5 rounded-2xl bg-gradient-to-r ${gradient}
                border shadow-xl cursor-pointer relative
                transition-all hover:shadow-2xl
              `}
            >
              <p className="text-lg font-semibold text-white">{item.name}</p>

              {item.description && (
                <p className="text-white/80 text-sm mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}

              <p className="text-white font-bold text-base mt-3">
                €{item.price}
              </p>

              {/* ADD BUTTON */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
                className="absolute top-1/2 -translate-y-1/2 right-4 bg-white text-black
                  w-10 h-10 flex items-center justify-center rounded-xl 
                  hover:bg-mint-300 active:scale-95 transition"
              >
                <Plus size={20} />
              </button>
            </div>
          );
        })}
      </div>

      {/* ITEM MODAL */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          restaurantId={restaurantId}
          onClose={() => setSelectedItem(null)}
        />
      )}

    </div>
  );
}

/* ----------------------------------------------------
      ITEM MODAL — GLASSMORPHISM + BLUE + MINT
---------------------------------------------------- */
function ItemModal({ item, restaurantId, onClose }: any) {
  const { addItem } = useCart();
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  function addToCart() {
    addItem(
      {
        ...item,
        notes,
        type: "restaurant",
        restaurant_id: item.restaurant_id || item.restaurantId || restaurantId,
      },
      quantity,
      notes
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-white/10 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative">

        {/* CLOSE */}
        <button
          className="absolute top-5 right-5 text-white/70 hover:text-white"
          onClick={onClose}
        >
          <X size={26} />
        </button>

        {/* TITLE */}
        <div className="text-center mb-4 mt-2">
          <h2 className="text-xl font-semibold text-pink-400">{item.name}</h2>

          {/* PRICE → BLUE */}
          <p className="text-blue-300 text-lg font-bold mt-1">
            €{item.price}
          </p>
        </div>

        {/* NOTES */}
        <textarea
          className="mt-4 w-full p-3 rounded-xl bg-white/5 border border-white/10 
                     text-white placeholder-white/40 resize-none"
          placeholder="Qka me bo / qka mos me bo…"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* QUANTITY */}
        <div className="flex items-center justify-between mt-5">
          <span className="text-white font-medium text-lg">Quantity</span>

          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">

            {/* MINT – */}
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg text-black text-xl flex items-center justify-center active:scale-95"
              style={{ backgroundColor: "#90FFCC" }}
            >
              –
            </button>

            <span className="text-white text-lg font-semibold w-8 text-center">
              {quantity}
            </span>

            {/* MINT + */}
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-lg text-black text-xl flex items-center justify-center active:scale-95"
              style={{ backgroundColor: "#90FFCC" }}
            >
              +
            </button>

          </div>
        </div>

        {/* BLUE GRADIENT ADD TO CART — AUTO WIDTH */}
        <button
          onClick={addToCart}
          className="mt-6 mx-auto px-8 py-3 rounded-xl text-white font-semibold text-lg
                     active:scale-95 transition shadow-lg block
                     bg-gradient-to-r from-blue-600 to-blue-800"
        >
          Add to cart · {(item.price * quantity).toFixed(2)}€
        </button>
      </div>
    </div>
  );
}
