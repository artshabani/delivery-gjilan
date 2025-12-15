"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, X, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/types/product";

import { useAdminGuard } from "@/app/hooks/useAdminGuard";

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
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/SortableItem";

export default function RestaurantDetail() {
  const { id } = useParams();
  const router = useRouter();
  const restaurantId = Number(id);

  const [restaurant, setRestaurant] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [internalProducts, setInternalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const { allowed: isAdmin } = useAdminGuard();

  // Section management state (admin only)
  const [sections, setSections] = useState<{ id: number, name: string, emoji: string }[]>([]);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionEmoji, setNewSectionEmoji] = useState("🍽️");
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editSectionForm, setEditSectionForm] = useState({ name: "", emoji: "" });

  // Bulk Assignment State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItemIds(newSet);
  };

  // Section filter state
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | null>(null);

  // Item creation/editing state (admin only)
  const [showAddItem, setShowAddItem] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    price: "",
    description: "",
    image_url: "",
    section: "",
  });

  const { addItem } = useCart();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEndExtras(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = internalProducts.findIndex((p) => p.id === active.id);
    const newIndex = internalProducts.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(internalProducts, oldIndex, newIndex);
    setInternalProducts(newOrder);

    // Prepare order data
    const orderData = newOrder.map((product, index) => ({
      id: product.id,
      sort_order: index,
    }));

    // Send to backend
    try {
      await fetch("/api/admin/products/reorder-extras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderData }),
      });
      toast.success("Order updated");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  }



  // Function to update item section in database
  async function updateItemSection(itemId: number, section: string | null, refresh: boolean = true) {
    try {
      const res = await fetch(`/api/admin/restaurants/items/update/${itemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: section,
        }),
      });

      if (res.ok) {
        if (refresh) {
          toast.success("Item section updated");
          // Reload items
          const itemsRes = await fetch(
            `/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`
          );
          const itemsData = await itemsRes.json();
          setItems(itemsData.items || []);
        }
      } else {
        toast.error("Failed to update section");
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

  // Update existing item
  async function updateItem() {
    if (!editingItemId) return;

    setAddingItem(true);
    try {
      const res = await fetch(`/api/admin/restaurants/items/update/${editingItemId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemForm.name,
          price: parseFloat(itemForm.price),
          description: itemForm.description,
          image_url: itemForm.image_url,
          section: itemForm.section || null,
        }),
      });

      if (res.ok) {
        toast.success("Item updated!");
        setItemForm({ name: "", price: "", description: "", image_url: "", section: "" });
        setEditingItemId(null);
        setShowAddItem(false);
        // Reload items
        const itemsRes = await fetch(`/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`);
        const itemsData = await itemsRes.json();
        setItems(itemsData.items || []);
      } else {
        toast.error("Failed to update item");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating item");
    } finally {
      setAddingItem(false);
    }
  }

  // Load sections from DB
  async function loadSections() {
    try {
      const res = await fetch(`/api/admin/restaurants/sections/list?restaurant_id=${restaurantId}`);
      const data = await res.json();
      if (data.sections) setSections(data.sections);
    } catch (err) {
      console.error("Failed to load sections", err);
    }
  }

  // Add new section
  async function addSection() {
    if (!newSectionName.trim()) return;

    const res = await fetch("/api/admin/restaurants/sections/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        name: newSectionName,
        emoji: newSectionEmoji
      })
    });

    if (res.ok) {
      toast.success("Section added");
      setNewSectionName("");
      setNewSectionEmoji("🍽️");
      loadSections();
    } else {
      toast.error("Failed to add section");
    }
  }

  // Migrate orphaned sections
  async function migrateOrphanedSections() {
    // Calculate orphaned sections from current items
    const uniqueSectionNames = Array.from(
      new Set(items.filter(item => item.section).map(item => item.section))
    );
    const orphanedNames = uniqueSectionNames.filter(name => !sections.find(s => s.name === name));

    if (orphanedNames.length === 0) {
      toast.error("No orphaned sections to migrate");
      return;
    }

    const toastId = toast.loading(`Migrating ${orphanedNames.length} section(s)...`);

    try {
      const promises = orphanedNames.map(name =>
        fetch("/api/admin/restaurants/sections/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            name: name,
            emoji: "🍽️"
          })
        })
      );

      await Promise.all(promises);

      toast.dismiss(toastId);
      toast.success(`Migrated ${orphanedNames.length} section(s)!`);
      loadSections();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to migrate sections");
      console.error(err);
    }
  }

  // Update section name/emoji
  async function updateSection(id: number, oldName: string, newName: string, newEmoji: string) {
    const res = await fetch(`/api/admin/restaurants/sections/update/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, emoji: newEmoji, old_name: oldName })
    });

    if (res.ok) {
      toast.success("Section updated");
      setEditingSection(null);
      loadSections();
      // Reload items because their section names might have changed
      const itemsRes = await fetch(`/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`);
      const itemsData = await itemsRes.json();
      setItems(itemsData.items || []);
    } else {
      toast.error("Failed to update section");
    }
  }

  // Delete section
  async function deleteSection(id: number) {
    if (!confirm("Delete this section and unassign all its items?")) return;

    const res = await fetch(`/api/admin/restaurants/sections/delete/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      toast.success("Section deleted");
      loadSections();
      // Reload items to see them unassigned
      const itemsRes = await fetch(`/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`);
      const itemsData = await itemsRes.json();
      setItems(itemsData.items || []);
    } else {
      toast.error("Failed to delete section");
    }
  }

  // Move section up or down
  async function moveSection(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    // Update local state immediately for smooth UX
    setSections(newSections);

    // Save to database
    const sectionIds = newSections.map(s => s.id);

    const res = await fetch("/api/admin/restaurants/sections/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        section_ids: sectionIds
      })
    });

    if (!res.ok) {
      toast.error("Failed to reorder sections");
      loadSections(); // Reload on error
    }
  }

  // Bulk Assign
  async function bulkAssign(sectionName: string) {
    if (selectedItemIds.size === 0) return;

    const toastId = toast.loading("Assigning items...");

    const promises = Array.from(selectedItemIds).map(id =>
      updateItemSection(id, sectionName, false)
    );

    await Promise.all(promises);

    toast.dismiss(toastId);
    toast.success(`Moved ${selectedItemIds.size} items to ${sectionName}`);

    setSelectionMode(false);
    setSelectedItemIds(new Set());

    // Reload items
    const itemsRes = await fetch(`/api/admin/restaurants/items/list?restaurant_id=${restaurantId}`);
    const itemsData = await itemsRes.json();
    setItems(itemsData.items || []);
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

        // Load sections
        loadSections();

        // Fetch internal products (cross-sell)
        // Filter by is_restaurant_extra = true
        const { data: prodData } = await supabase
          .from("products")
          .select("*")
          .eq("is_restaurant_extra", true)
          .order("extra_sort_order", { ascending: true, nullsFirst: false })
          .limit(20);
        
        if (prodData) {
          setInternalProducts(prodData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white px-4 sm:px-6 py-10 pb-28">
        <div className="max-w-3xl mx-auto">
          {/* Back Button Skeleton */}
          <div className="mb-6">
            <div className="h-10 w-24 bg-slate-800/50 rounded-lg mb-4 animate-pulse"></div>
            
            {/* Header Skeleton */}
            <div className="text-center">
              <div className="h-10 w-64 bg-slate-800/50 rounded-lg mx-auto mb-4 animate-pulse"></div>
              
              {/* Admin Buttons Skeleton */}
              <div className="mt-4 flex gap-2 justify-center flex-wrap">
                <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse"></div>
                <div className="h-10 w-28 bg-slate-800/50 rounded-lg animate-pulse"></div>
                <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Section Tabs Skeleton */}
          <div className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-4 flex-wrap">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-24 bg-slate-800/50 rounded-full animate-pulse"></div>
              ))}
            </div>
          </div>

          {/* Menu Items Skeleton */}
          <div className="space-y-6">
            {[1, 2, 3].map((section) => (
              <div key={section}>
                {/* Section Header Skeleton */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 bg-slate-800/50 rounded animate-pulse"></div>
                  <div className="h-7 w-40 bg-slate-800/50 rounded animate-pulse"></div>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
                </div>

                {/* Section Items Skeleton */}
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between gap-4 p-5 
                                 bg-slate-900/30 border border-slate-800/50 
                                 rounded-xl shadow-sm animate-pulse"
                    >
                      <div className="flex flex-col flex-1">
                        <div className="h-5 w-32 bg-slate-800/50 rounded mb-2"></div>
                        <div className="h-5 w-20 bg-slate-800/50 rounded"></div>
                      </div>
                      <div className="h-12 w-12 bg-slate-800/50 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!restaurant)
    return <p className="p-6 text-red-400 font-semibold">Restaurant not found.</p>;

  // Dynamically extract unique sections from items
  const uniqueSectionNames = Array.from(
    new Set(items.filter(item => item.section).map(item => item.section))
  );

  // Merge with hardcoded sections for admin management
  const allSections: { id?: number, name: string, emoji: string }[] = [
    ...sections,
    ...uniqueSectionNames
      .filter(name => !sections.find(s => s.name === name))
      .map(name => ({ name, emoji: "🍽️" }))
  ];

  // Group items by assigned sections
  const groupedSections = allSections
    .map(section => ({
      ...section,
      items: items.filter(item => item.section === section.name)
    }))
    .filter(section => section.items.length > 0)
    .filter(section => !selectedSectionFilter || section.name === selectedSectionFilter);

  // Unassigned items
  const unassignedItems = items.filter(item => !item.section);

  return (
    <div className="min-h-screen bg-black text-white px-4 sm:px-6 py-10 pb-28">
      <div className="max-w-3xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition text-white shadow-md hover:shadow-lg"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-semibold">{restaurant.name}</h1>

            {/* Admin Buttons */}
            {isAdmin && (
              <div className="mt-4 flex gap-2 justify-center flex-wrap">
                <button
                  onClick={() => setShowSectionManager(!showSectionManager)}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm font-semibold transition"
                >
                  {showSectionManager ? "Hide" : "Manage"} Sections
                </button>
                <button
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold transition"
                >
                  {showAddItem ? "Hide" : "Add"} Item
                </button>
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedItemIds(new Set());
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectionMode ? "bg-blue-600 text-white" : "bg-slate-800/60 border border-slate-700 text-white/70 hover:bg-slate-700 hover:text-white"}`}
                >
                  {selectionMode ? "Cancel Selection" : "Bulk Edit"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SECTION FILTERS */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide sm:justify-center">
          <button
            onClick={() => setSelectedSectionFilter(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap border
              ${!selectedSectionFilter
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-800/60 border-slate-700 text-white hover:bg-slate-700"}`}
          >
            All
          </button>

          {allSections.map((section) => (
            <button
              key={section.name}
              onClick={() => setSelectedSectionFilter(
                selectedSectionFilter === section.name ? null : section.name
              )}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap border
                ${selectedSectionFilter === section.name
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800/60 border-slate-700 text-white hover:bg-slate-700"}`}
            >
              <span>{section.emoji}</span>
              <span>{section.name}</span>
            </button>
          ))}
        </div>

        {/* SECTION MANAGER - Admin Only */}
        {isAdmin && showSectionManager && (
          <div className="mb-8 p-6 bg-slate-900/30 border border-slate-800/50 rounded-xl">
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
                  onClick={addSection}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Existing Sections */}
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2">Existing Sections</p>

              {/* Show orphaned sections warning */}
              {uniqueSectionNames.filter(name => !sections.find(s => s.name === name)).length > 0 && (
                <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-yellow-200 flex-1">
                      ⚠️ Found {uniqueSectionNames.filter(name => !sections.find(s => s.name === name)).length} orphaned section(s) from old items:
                      <span className="font-semibold"> {uniqueSectionNames.filter(name => !sections.find(s => s.name === name)).join(", ")}</span>
                    </p>
                    <button
                      onClick={migrateOrphanedSections}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-semibold whitespace-nowrap transition"
                    >
                      Migrate All
                    </button>
                  </div>
                </div>
              )}

              {sections.length === 0 && (
                <p className="text-sm text-white/60 py-4">No sections yet. Add one above!</p>
              )}

              {sections.map((section, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg">
                  {editingSection === section.id ? (
                    // Edit mode
                    <>
                      <input
                        type="text"
                        value={editSectionForm.emoji}
                        onChange={(e) => setEditSectionForm({ ...editSectionForm, emoji: e.target.value })}
                        className="w-12 px-2 py-1 bg-slate-700 rounded text-center"
                        maxLength={2}
                      />
                      <input
                        type="text"
                        value={editSectionForm.name}
                        onChange={(e) => setEditSectionForm({ ...editSectionForm, name: e.target.value })}
                        className="flex-1 px-2 py-1 bg-slate-700 rounded"
                      />
                      <button
                        onClick={() => {
                          if (editSectionForm.name.trim()) {
                            updateSection(section.id!, section.name, editSectionForm.name, editSectionForm.emoji);
                          }
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    // View mode
                    <>
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSection(idx, 'up')}
                          disabled={idx === 0}
                          className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSection(idx, 'down')}
                          disabled={idx === sections.length - 1}
                          className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      <span className="flex-1">{section.emoji} {section.name}</span>
                      <button
                        onClick={() => {
                          if (section.id) {
                            setEditingSection(section.id);
                            setEditSectionForm({ name: section.name, emoji: section.emoji });
                          }
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (section.id) deleteSection(section.id);
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD/EDIT ITEM FORM - Admin Only */}
        {isAdmin && showAddItem && (
          <div className="mb-8 p-6 bg-slate-900/30 border border-slate-800/50 rounded-xl">
            <h3 className="text-xl font-bold mb-4">{editingItemId ? "Edit Item" : "Add New Item"}</h3>

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
                  {allSections.map((section) => (
                    <option key={section.name} value={section.name}>
                      {section.emoji} {section.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={editingItemId ? updateItem : addItemToRestaurant}
                disabled={addingItem}
                className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold disabled:opacity-50 transition"
              >
                {addingItem ? "Saving..." : (editingItemId ? "Update Item" : "Add Item")}
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
                             bg-slate-900/30 border border-slate-800/50 
                             rounded-xl shadow-sm hover:bg-slate-900/50 
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
                      {allSections.map((section) => (
                        <option key={section.name} value={section.name}>
                          {section.emoji} {section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectionMode ? (
                    <div
                      onClick={() => toggleSelection(item.id)}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer ${selectedItemIds.has(item.id) ? "bg-blue-500 border-blue-500" : "border-slate-600"}`}
                    >
                      {selectedItemIds.has(item.id) && <span className="text-white">✓</span>}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 
                                 active:scale-95 transition flex items-center justify-center 
                                 shadow-lg shadow-blue-600/40"
                    >
                      <Plus size={22} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INTERNAL STORE PRODUCTS (CROSS-SELL) */}
        {internalProducts.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🥤</span>
              <h2 className="text-2xl font-bold text-white">Pijet</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndExtras}
            >
              <SortableContext
                items={internalProducts.map((p) => p.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                  {internalProducts.map((product) => (
                    <SortableItem key={product.id} id={product.id} disabled={!isAdmin} className="flex-shrink-0">
                      <div className="w-[120px] transform transition-transform active:scale-95">
                        <ProductCard 
                          {...product} 
                          price={product.restaurant_price || product.price}
                        />
                      </div>
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
                               bg-slate-900/30 border border-slate-800/50 
                               rounded-xl shadow-sm hover:bg-slate-900/50 
                               transition"
                  >
                    <div className="flex flex-col">
                      <p className="text-lg font-semibold text-white">{item.name}</p>
                      <p className="text-xl font-bold text-blue-400 mt-1">
                        €{Number(item.price).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2 items-center">
                      {selectionMode && (
                        <div
                          onClick={() => toggleSelection(item.id)}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer ${selectedItemIds.has(item.id) ? "bg-blue-500 border-blue-500" : "border-slate-600"}`}
                        >
                          {selectedItemIds.has(item.id) && <span className="text-white">✓</span>}
                        </div>
                      )}

                      {!selectionMode && isAdmin && (
                        <button
                          onClick={() => {
                            setEditingItemId(item.id);
                            setItemForm({
                              name: item.name,
                              price: item.price.toString(),
                              description: item.description || "",
                              image_url: item.image_url || "",
                              section: item.section || "",
                            });
                            setShowAddItem(true);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 
                                     active:scale-95 transition flex items-center justify-center 
                                     shadow-lg shadow-purple-600/40"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      )}

                      {!selectionMode && (
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 
                                     active:scale-95 transition flex items-center justify-center 
                                     shadow-lg shadow-blue-600/40"
                        >
                          <Plus size={22} className="text-white" />
                        </button>
                      )}
                    </div>
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

      {/* BULK ACTION BAR */}
      {selectionMode && selectedItemIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <span className="font-semibold text-white">{selectedItemIds.size} items selected</span>

          <select
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            onChange={(e) => {
              if (e.target.value) bulkAssign(e.target.value);
            }}
            value=""
          >
            <option value="">Move to section...</option>
            {allSections.map(s => (
              <option key={s.name} value={s.name}>{s.emoji} {s.name}</option>
            ))}
          </select>

          <button
            onClick={() => setSelectedItemIds(new Set())}
            className="text-white/60 hover:text-white text-sm"
          >
            Clear
          </button>
        </div>
      )}

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
      <div className="w-full max-w-sm bg-slate-900/90 border border-slate-700 rounded-xl p-6 shadow-2xl relative">

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

