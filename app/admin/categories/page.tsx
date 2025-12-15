"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/SortableItem";

interface Category {
  id: number;
  name: string;
  icon_url: string | null;
  sort_order: number;
  parent_id: number | null;
}

export default function AdminCategories() {
  const guard = useAdminGuard();

  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  // Form state
  const [editName, setEditName] = useState("");
  const [editIconUrl, setEditIconUrl] = useState("");
  const [editParentId, setEditParentId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filterParent, setFilterParent] = useState<number | null | "all">("all");

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load categories
  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories/list");
    const result = await res.json();
    if (result.categories) {
      setCategories(result.categories);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Create or update category
  const saveCategory = async () => {
    if (!editName.trim()) {
      alert("Category name is required");
      return;
    }

    const url = editingCategory?.id
      ? "/api/admin/categories/update"
      : "/api/admin/categories/create";

    const payload = editingCategory?.id
      ? {
          id: editingCategory.id,
          name: editName,
          icon_url: editIconUrl || null,
          parent_id: editParentId,
        }
      : {
          name: editName,
          icon_url: editIconUrl || null,
          parent_id: editParentId,
        };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.error) {
      alert(result.error);
      return;
    }

    // Close modal and refresh
    setEditingCategory(null);
    setEditName("");
    setEditIconUrl("");
    setEditParentId(null);
    fetchCategories();
  };

  // Delete category
  const deleteCategory = async (id: number) => {
    const res = await fetch("/api/admin/categories/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const result = await res.json();
    if (result.error) {
      alert(result.error);
      return;
    }

    setDeleteConfirmId(null);
    fetchCategories();
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const parentFilter = filterParent === "all" ? null : filterParent;
    const filteredCategories = categories.filter(
      (cat) => cat.parent_id === parentFilter
    );

    const oldIndex = filteredCategories.findIndex((cat) => cat.id === active.id);
    const newIndex = filteredCategories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredCategories, oldIndex, newIndex).map(
      (cat, index) => ({
        ...cat,
        sort_order: index,
      })
    );

    // Optimistic update
    const updatedCategories = categories.map((cat) => {
      const updated = reordered.find((r) => r.id === cat.id);
      return updated || cat;
    });
    setCategories(updatedCategories);

    // Send to API
    await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: reordered.map((cat) => ({
          id: cat.id,
          sort_order: cat.sort_order,
        })),
      }),
    });
  };

  // Open edit modal
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditIconUrl(category.icon_url || "");
    setEditParentId(category.parent_id);
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingCategory({} as Category);
    setEditName("");
    setEditIconUrl("");
    setEditParentId(null);
  };

  // Get parent categories (for dropdown)
  const parentCategories = categories.filter((cat) => cat.parent_id === null);

  // Get filtered categories
  const getFilteredCategories = () => {
    let filtered = categories;

    // Filter by parent
    if (filterParent !== "all") {
      filtered = filtered.filter((cat) => cat.parent_id === filterParent);
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((cat) =>
        cat.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredCategories = getFilteredCategories();

  // Get parent name
  const getParentName = (parentId: number | null) => {
    if (!parentId) return "—";
    const parent = categories.find((cat) => cat.id === parentId);
    return parent?.name || "Unknown";
  };

  // Get subcategory count
  const getSubcategoryCount = (parentId: number) => {
    return categories.filter((cat) => cat.parent_id === parentId).length;
  };

  if (!guard) return null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-black text-gray-200 p-6 sm:p-8">
      {/* NAVIGATION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <Link
          href="/admin/users"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-105"
        >
          <span className="text-xl">👥</span>
          <span>Users</span>
        </Link>
        <Link
          href="/admin/orders"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105"
        >
          <span className="text-xl">📦</span>
          <span>Orders</span>
        </Link>
        <Link
          href="/admin/restaurants"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/50 hover:scale-105"
        >
          <span className="text-xl">🍽️</span>
          <span>Restaurants</span>
        </Link>
        <Link
          href="/admin/products"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-emerald-500/50 hover:scale-105"
        >
          <span className="text-xl">🛍️</span>
          <span>Products</span>
        </Link>
        <Link
          href="/admin/analytics"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
        >
          <span className="text-xl">📊</span>
          <span>Analytics</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">🏷️ Categories</h1>
          <p className="text-white/60 text-sm mt-1">Manage categories and subcategories</p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-yellow-500/50 hover:scale-105"
        >
          + Add Category
        </button>
      </div>

      {/* SEARCH & FILTER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="🔍 Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 transition"
        />
        <select
          value={filterParent === null ? "root" : filterParent === "all" ? "all" : filterParent}
          onChange={(e) => {
            const val = e.target.value;
            setFilterParent(val === "all" ? "all" : val === "root" ? null : Number(val));
          }}
          className="p-3 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition cursor-pointer sm:w-64"
        >
          <option value="all">All Categories</option>
          <option value="root">Root Only</option>
          {parentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              Sub of {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Categories List */}
      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredCategories.map((cat) => cat.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {filteredCategories.map((category) => (
                <SortableItem key={category.id} id={category.id}>
                  <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      {/* Category Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          {category.icon_url && (
                            <Image
                              src={category.icon_url}
                              alt={category.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-lg object-cover border border-white/10"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white truncate">
                              {category.name}
                            </h3>
                            <p className="text-xs text-white/50">
                              {category.parent_id === null ? "Root Category" : `Parent: ${getParentName(category.parent_id)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 text-xs">
                          <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
                            <span className="text-white/60">Sort:</span>
                            <span className="text-white font-semibold">{category.sort_order}</span>
                          </div>
                          {category.parent_id === null && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
                              <span className="text-white/60">Subcategories:</span>
                              <span className="text-white font-semibold">{getSubcategoryCount(category.id)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-fit">
                        <button
                          onClick={() => openEditModal(category)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(category.id)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-red-500/50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </SortableItem>
              ))}

              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/60 text-lg">No categories found</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Edit/Create Modal */}
      {editingCategory && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setEditingCategory(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 max-w-lg w-full border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingCategory.id ? "Edit Category" : "Create Category"}
            </h2>

            <div className="space-y-4 mb-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., Pije, Ushqim, etc."
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 text-white rounded-lg placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none transition"
                />
              </div>

              {/* Icon URL */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Icon URL (Optional)
                </label>
                <input
                  type="text"
                  value={editIconUrl}
                  onChange={(e) => setEditIconUrl(e.target.value)}
                  placeholder="https://example.com/icon.png"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 text-white rounded-lg placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none transition"
                />
                {editIconUrl && (
                  <Image
                    src={editIconUrl}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="mt-3 w-16 h-16 rounded-lg object-cover border border-white/10"
                  />
                )}
              </div>

              {/* Parent Category */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Parent Category (Optional)
                </label>
                <select
                  value={editParentId === null ? "" : editParentId}
                  onChange={(e) =>
                    setEditParentId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-4 py-3 bg-slate-700/50 border border-white/10 text-white rounded-lg focus:border-blue-500/50 focus:outline-none transition cursor-pointer"
                >
                  <option value="">None (Root Category)</option>
                  {parentCategories
                    .filter((cat) => cat.id !== editingCategory.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-white/50 mt-2">
                  Leave empty to create a root category
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveCategory}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
              >
                {editingCategory.id ? "Save Changes" : "Create Category"}
              </button>
              <button
                onClick={() => setEditingCategory(null)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 max-w-md w-full border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-4">Delete Category?</h2>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteCategory(deleteConfirmId)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-red-500/50"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
