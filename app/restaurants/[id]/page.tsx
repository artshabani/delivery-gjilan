"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

import { useAdminGuard } from "@/app/hooks/useAdminGuard";

export default function RestaurantDetail() {
  const { id } = useParams();
  const restaurantId = Number(id);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { allowed: isAdmin } = useAdminGuard();

  // Section management state (admin only)
  const [sections, setSections] = useState<{ name: string, emoji: string }[]>([
    { name: "Breakfast", emoji: "🍳" },
    { name: "Burgers", emoji: "🍔" },
    { name: "Pizza", emoji: "🍕" },
    { name: "Drinks", emoji: "🥤" },
  ]);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionEmoji, setNewSectionEmoji] = useState("🍽️");

  // Item creation state (admin only)
  const [showAddItem, setShowAddItem] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    name: "",
    price: "",
    description: "",
    image_url: "",
    section: "",
  });

  const { addItem } = useCart();

  // Function to update item section in database
  async function updateItemSection(itemId: number, section: string | null) {
    try {
      const res = await fetch(`/api/admin/restaurants/items/update/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: items.find(i => i.id === itemId)?.name,
          price: items.find(i => i.id === itemId)?.price,
          description: items.find(i => i.id === itemId)?.description,
          image_url: items.find(i => i.id === itemId)?.image_url,
          section: section,
        }),
      });

      if (res.ok) {
        // Update local state
        setItems(items.map(item =>
          item.id === itemId ? { ...item, section } : item
        ));
        // toast.success("Section updated!"); // Uncomment if toast is available
      } else {
        // toast.error("Failed to update section"); // Uncomment if toast is available
        console.error("Failed to update section");
      }
    } catch (err) {
      console.error(err);
      // toast.error("Error updating section"); // Uncomment if toast is available
    }
  }

  // Function to add new item (admin only)
  async function addItemToRestaurant() {
    if (!itemForm.name || !itemForm.price) {
      toast.error("Name and price are required");
      return;
    }

    setAddingItem(true);
    try {
      const res = await fetch(`/api/admin/restaurants/items/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          name: itemForm.name,
          price: Number(itemForm.price),
          description: itemForm.description,
          image_url: itemForm.image_url,
          section: itemForm.section || null,
        }),
      });

      if (res.ok) {
        toast.success("Item added!");
        setItemForm({ name: "", price: "", description: "", image_url: "", section: "" });
        setShowAddItem(false);
        // Reload items
        const itemsRes = await fetch(
          `/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`
        );
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      } else {
        toast.error("Failed to add item");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error adding item");
    } finally {
      setAddingItem(false);
    }
  }

  // Load sections from localStorage (This part is now removed as per instruction)
  // useEffect(() => {
  //   const storedSections = localStorage.getItem(`sections_${restaurantId}`);
  //   const storedItemSections = localStorage.getItem(`itemSections_${restaurantId}`);

  //   if (storedSections) {
  //     setSections(JSON.parse(storedSections));
  //   } else {
  //     // Default sections
  //     setSections([
  //       { name: "Breakfast", emoji: "🍳" },
  //       { name: "Burgers", emoji: "🍔" },
  //       { name: "Pizza", emoji: "🍕" },
  //       { name: "Drinks", emoji: "🥤" },
  //     ]);
  //   }

  //   if (storedItemSections) {
  //     setItemSections(JSON.parse(storedItemSections));
  //   }
  // }, [restaurantId]);

  // Save sections to localStorage (This part is now removed as per instruction)
  // useEffect(() => {
  //   if (sections.length > 0) {
  //     localStorage.setItem(`sections_${restaurantId}`, JSON.stringify(sections));
  //   }
  // }, [sections, restaurantId]);

  // useEffect(() => {
  //   localStorage.setItem(`itemSections_${restaurantId}`, JSON.stringify(itemSections));
  // }, [itemSections, restaurantId]);

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

  // Group items by assigned sections
  const groupedSections = sections.map(section => ({
    ...section,
    items: items.filter(item => item.section === section.name)
  })).filter(section => section.items.length > 0);

  // Unassigned items
  const unassignedItems = items.filter(item => !item.section);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 sm:px-6 py-10 pb-28">
      <div className="max-w-3xl mx-auto">

        {/* HEADER */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-semibold mt-2">{restaurant.name}</h1>

          {/* Admin Buttons */}
          {isAdmin && (
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => setShowSectionManager(!showSectionManager)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold transition"
              >
                {showSectionManager ? "Hide" : "Manage"} Sections
              </button>
              <button
                onClick={() => setShowAddItem(!showAddItem)}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-semibold transition"
              >
                {showAddItem ? "Hide" : "Add"} Item
              </button>
            </div>
          )}
        </div>

        {/* SECTION MANAGER - Admin Only */}
        {isAdmin && showSectionManager && (
          <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <h3 className="text-xl font-bold mb-4">Section Manager</h3>

            {/* Add New Section */}
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl">
              <p className="text-sm font-semibold mb-3">Add New Section</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Emoji"
                  value={newSectionEmoji}
                  onChange={(e) => setNewSectionEmoji(e.target.value)}
                  className="w-16 px-2 py-2 bg-slate-700 rounded-lg text-center"
                  maxLength={2}
                />
                <input
                  type="text"
                  placeholder="Section name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-700 rounded-lg"
                />
                <button
                  onClick={() => {
                    if (newSectionName.trim()) {
                      setSections([...sections, { name: newSectionName, emoji: newSectionEmoji }]);
                      setNewSectionName("");
                      setNewSectionEmoji("🍽️");
                    }
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Existing Sections */}
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2">Existing Sections</p>
              {sections.map((section, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <span>{section.emoji} {section.name}</span>
                  <button
                    onClick={async () => {
                      // Remove section and unassign items
                      setSections(sections.filter((_, i) => i !== idx));
                      // Unassign all items with this section
                      const itemsToUnassign = items.filter(item => item.section === section.name);
                      for (const item of itemsToUnassign) {
                        await updateItemSection(item.id, null);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD ITEM FORM - Admin Only */}
        {isAdmin && showAddItem && (
          <div className="mb-8 p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <h3 className="text-xl font-bold mb-4">Add New Item</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/70">Name *</label>
                <input
                  className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Price (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Description</label>
                <textarea
                  className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-white resize-none"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Image URL</label>
                <input
                  className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  value={itemForm.image_url}
                  onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Section</label>
                <select
                  className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  value={itemForm.section}
                  onChange={(e) => setItemForm({ ...itemForm, section: e.target.value })}
                >
                  <option value="">No Section</option>
                  {sections.map((section) => (
                    <option key={section.name} value={section.name}>
                      {section.emoji} {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={addItemToRestaurant}
                disabled={addingItem}
                className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold disabled:opacity-50 transition"
              >
                {addingItem ? "Adding..." : "Add Item"}
              </button>
            </div>
          </div>
        )}

        {/* UNASSIGNED ITEMS - Admin Only */}
        {isAdmin && unassignedItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📋</span>
              <h2 className="text-2xl font-bold text-white">Unassigned Items</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
            </div>

            <div className="space-y-3">
              {unassignedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-5 
                             bg-slate-900/50 border border-slate-800 
                             rounded-2xl shadow-sm hover:bg-slate-900/70 
                             transition"
                >
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{item.name}</p>
                    <p className="text-xl font-bold text-blue-400 mt-1">
                      €{Number(item.price).toFixed(2)}
                    </p>

                    {/* Section Assignment */}
                    <select
                      value={item.section || ""}
                      onChange={(e) => {
                        updateItemSection(item.id, e.target.value || null);
                      }}
                      className="mt-2 px-3 py-1 bg-slate-700 rounded-lg text-sm"
                    >
                      <option value="">Assign to section...</option>
                      {sections.map((section) => (
                        <option key={section.name} value={section.name}>
                          {section.emoji} {section.name}
                        </option>
                      ))}
                    </select>
                  </div>

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
          </div>
        )}

        {/* MENU BY SECTIONS */}
        <div className="space-y-8">
          {groupedSections.map((section) => (
            <div key={section.name}>
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{section.emoji}</span>
                <h2 className="text-2xl font-bold text-white">{section.name}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
              </div>

              {/* Section Items */}
              <div className="space-y-3">
                {section.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 p-5 
                               bg-slate-900/50 border border-slate-800 
                               rounded-2xl shadow-sm hover:bg-slate-900/70 
                               transition"
                  >
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-white">{item.name}</p>
                      <p className="text-xl font-bold text-blue-400 mt-1">
                        €{Number(item.price).toFixed(2)}
                      </p>
                    </div>

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
            </div>
          ))}
        </div>

        {/* ITEM MODAL */}
        {selectedItem && (
          <ItemModal
            item={selectedItem}
            restaurantId={restaurantId}
            restaurantName={restaurant.name}
            onClose={() => setSelectedItem(null)}
          />
        )}

      </div>
    </div >
  );
}

/* ----------------------------------------------------
      ITEM MODAL — CLEANER + BLUE THEME
---------------------------------------------------- */
function ItemModal({ item, restaurantId, restaurantName, onClose }: any) {
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
        restaurant_name: restaurantName,
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

