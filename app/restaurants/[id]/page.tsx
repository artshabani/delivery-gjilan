"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

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
    <div className="min-h-screen bg-slate-950 text-white px-4 sm:px-6 py-10">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold mt-2">{restaurant.name}</h1>
          
        </div>

        {/* MENU LIST */}
<div>
          {items.map((item) => (
  <div
    key={item.id}
    className="flex items-center justify-between gap-4 p-5 
               bg-slate-900/50 border border-slate-800 
               rounded-2xl shadow-sm hover:bg-slate-900/70 
               transition"
  >
    {/* LEFT */}
    <div className="flex flex-col">
      <p className="text-lg font-semibold text-white">{item.name}</p>
      <p className="text-xl font-bold text-blue-400 mt-1">
        €{Number(item.price).toFixed(2)}
      </p>
    </div>

    {/* BLUE FLOATING + BUTTON */}
    <button
      onClick={() => setSelectedItem(item)}
      className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 
                 active:scale-95 transition flex items-center justify-center 
                 shadow-lg shadow-blue-600/40"
    >
      <Plus size={22} className="text-white" />
    </button>
  </div>
))}

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
    </div>
  );
}

/* ----------------------------------------------------
      ITEM MODAL — CLEANER + BLUE THEME
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
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-md flex items-center justify-center px-5 animate-fadeIn">
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-700 rounded-3xl p-6 shadow-2xl relative">

        {/* CLOSE */}
        <button
          className="absolute top-5 right-5 text-white/70 hover:text-white transition"
          onClick={onClose}
        >
          <X size={26} />
        </button>

        {/* TITLE */}
        <div className="text-center mb-4 mt-2">
          <h2 className="text-xl font-semibold text-white">{item.name}</h2>
          <p className="text-blue-300 text-lg font-bold mt-1">
            €{Number(item.price).toFixed(2)}
          </p>
        </div>

        {/* NOTES */}
        <textarea
          className="mt-4 w-full p-3 rounded-xl bg-slate-800 border border-slate-700 
                     text-white placeholder-white/40 resize-none"
          placeholder="Notes… (optional)"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* QUANTITY */}
        <div className="flex items-center justify-between mt-6">
          <span className="text-white font-medium text-lg">Quantity</span>

          <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">

            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-lg text-black text-xl flex items-center justify-center active:scale-95"
              style={{ backgroundColor: "#90FFCC" }}
            >
              –
            </button>

            <span className="text-white text-lg font-bold w-8 text-center">
              {quantity}
            </span>

            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded-lg text-black text-xl flex items-center justify-center active:scale-95"
              style={{ backgroundColor: "#90FFCC" }}
            >
              +
            </button>

          </div>
        </div>

        {/* ADD TO CART BUTTON */}
        <button
          onClick={addToCart}
          className="mt-6 w-full py-3 rounded-xl text-white font-semibold text-lg
                     active:scale-95 transition shadow-lg bg-blue-600 hover:bg-blue-500"
        >
          Add • €{(Number(item.price) * quantity).toFixed(2)}
        </button>

      </div>
    </div>
  );
}
