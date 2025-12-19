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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: number;
  name: string;
  icon_url: string | null;
  sort_order: number;
  parent_id: number | null;
}

interface CategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  getParentName: (parentId: number | null) => string;
  getSubcategoryCount: (id: number) => number;
}

function CategoryItem({ category, onEdit, onDelete, getParentName, getSubcategoryCount }: CategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-white/5 rounded-lg transition-colors mt-2"
            title="Drag to reorder"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5 text-white/40"
            >
              <line x1="4" y1="8" x2="20" y2="8" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="16" x2="20" y2="16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

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
              {category.parent_id === null ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <span className="text-blue-200">🏠 Root Category</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <span className="text-purple-200">📁 Subcategory</span>
                </div>
              )}
              {category.parent_id === null && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg border border-green-500/30">
                  <span className="text-green-200">Subs:</span>
                  <span className="text-green-200 font-semibold">{getSubcategoryCount(category.id)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 min-w-fit">
            <button
              onClick={() => onEdit(category)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(category.id)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-red-500/50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ParentCategoryCardProps {
  group: { parent: Category; subcategories: Category[] };
  isExpanded: boolean;
  hasSubcategories: boolean;
  toggleCategoryExpanded: (categoryId: number) => void;
  openEditModal: (category: Category) => void;
  setDeleteConfirmId: (id: number) => void;
  getParentName: (parentId: number | null) => string;
  getSubcategoryCount: (id: number) => number;
  handleSubcategoryDragEnd: (event: DragEndEvent, parentId: number) => void;
  sensors: any;
}

function ParentCategoryCard({
  group,
  isExpanded,
  hasSubcategories,
  toggleCategoryExpanded,
  openEditModal,
  setDeleteConfirmId,
  getParentName,
  getSubcategoryCount,
  handleSubcategoryDragEnd,
  sensors
}: ParentCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.parent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="bg-slate-800/20 backdrop-blur-sm border border-white/5 rounded-2xl p-6">
        {/* Parent Category Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
                <div className="flex items-start gap-4">
                  {/* Drag Handle */}
                  <div
                    {...attributes}
                    {...listeners}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-white/5 rounded-lg transition-colors mt-2"
                    title="Drag to reorder"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="w-5 h-5 text-white/40"
                    >
                      <line x1="4" y1="8" x2="20" y2="8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="4" y1="16" x2="20" y2="16" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      {group.parent.icon_url && (
                        <Image
                          src={group.parent.icon_url}
                          alt={group.parent.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover border border-white/10"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {group.parent.name}
                        </h3>
                        <p className="text-xs text-white/50">
                          Root Category
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs">
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg">
                        <span className="text-white/60">Sort:</span>
                        <span className="text-white font-semibold">{group.parent.sort_order}</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
                        <span className="text-blue-200">🏠 Root Category</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg border border-green-500/30">
                        <span className="text-green-200">Subs:</span>
                        <span className="text-green-200 font-semibold">{getSubcategoryCount(group.parent.id)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 min-w-fit">
                    <button
                      onClick={() => openEditModal(group.parent)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(group.parent.id)}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-lg text-sm font-semibold transition-all shadow-lg hover:shadow-red-500/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expand/Collapse Button */}
            {hasSubcategories && (
              <button
                onClick={() => toggleCategoryExpanded(group.parent.id)}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10 hover:border-white/20"
                title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className={`w-5 h-5 text-white/60 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Subcategories - Show only when expanded */}
        {hasSubcategories && isExpanded && (
          <div className="ml-8 animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
              <span>📁</span>
              <span>Subcategories ({group.subcategories.length})</span>
            </h4>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleSubcategoryDragEnd(event, group.parent.id)}
            >
              <SortableContext
                items={group.subcategories.map((cat) => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {group.subcategories.map((category) => (
                    <CategoryItem
                      key={category.id}
                      category={category}
                      onEdit={openEditModal}
                      onDelete={setDeleteConfirmId}
                      getParentName={getParentName}
                      getSubcategoryCount={getSubcategoryCount}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
        
        {/* No subcategories message */}
        {!hasSubcategories && isExpanded && (
          <div className="ml-8 text-white/40 text-sm italic">
            No subcategories yet
          </div>
        )}
      </div>
    </div>
  );
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
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

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
    // Auto-expand all parent categories by default
    const parentIds = categories
      .filter(cat => cat.parent_id === null)
      .map(cat => cat.id);
    setExpandedCategories(new Set(parentIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const filteredCategories = categories
      .filter((cat) => cat.parent_id === parentFilter)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const oldIndex = filteredCategories.findIndex((cat) => cat.id === active.id);
    const newIndex = filteredCategories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredCategories, oldIndex, newIndex).map(
      (cat, index) => ({
        ...cat,
        sort_order: index,
      })
    );

    // Optimistic update: merge reordered categories back into the full list
    const updatedCategories = categories.map((cat) => {
      const updated = reordered.find((r) => r.id === cat.id);
      return updated || cat;
    });
    setCategories(updatedCategories);

    // Send to API
    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: reordered.map((cat) => ({
            id: cat.id,
            sort_order: cat.sort_order,
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to reorder categories");
      }
    } catch (error: any) {
      console.error("Error reordering categories:", error);
      // Revert on error
      fetchCategories();
    }
  };

  // Handle drag end for subcategories within a parent group
  const handleSubcategoryDragEnd = async (event: DragEndEvent, parentId: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const subcategories = categories
      .filter((cat) => cat.parent_id === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const oldIndex = subcategories.findIndex((cat) => cat.id === active.id);
    const newIndex = subcategories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(subcategories, oldIndex, newIndex).map(
      (cat, index) => ({
        ...cat,
        sort_order: index,
      })
    );

    // Optimistic update: merge reordered subcategories back into the full list
    const updatedCategories = categories.map((cat) => {
      const updated = reordered.find((r) => r.id === cat.id);
      return updated || cat;
    });
    setCategories(updatedCategories);

    // Send to API
    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: reordered.map((cat) => ({
            id: cat.id,
            sort_order: cat.sort_order,
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to reorder subcategories");
      }
    } catch (error: any) {
      console.error("Error reordering subcategories:", error);
      // Revert on error
      fetchCategories();
    }
  };

  // Handle drag end for parent categories in grouped view
  const handleParentCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const parentCategories = categories
      .filter((cat) => cat.parent_id === null)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const oldIndex = parentCategories.findIndex((cat) => cat.id === active.id);
    const newIndex = parentCategories.findIndex((cat) => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(parentCategories, oldIndex, newIndex).map(
      (cat, index) => ({
        ...cat,
        sort_order: index,
      })
    );

    // Optimistic update: merge reordered parent categories back into the full list
    const updatedCategories = categories.map((cat) => {
      const updated = reordered.find((r) => r.id === cat.id);
      return updated || cat;
    });
    setCategories(updatedCategories);

    // Send to API
    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: reordered.map((cat) => ({
            id: cat.id,
            sort_order: cat.sort_order,
          })),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to reorder parent categories");
      }
    } catch (error: any) {
      console.error("Error reordering parent categories:", error);
      // Revert on error
      fetchCategories();
    }
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

    // Sort by sort_order within each parent group
    return filtered.sort((a, b) => {
      // First sort by parent_id (nulls first for root categories)
      if (a.parent_id !== b.parent_id) {
        if (a.parent_id === null) return -1;
        if (b.parent_id === null) return 1;
        return (a.parent_id || 0) - (b.parent_id || 0);
      }
      // Then sort by sort_order within the same parent group
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  };

  const filteredCategories = getFilteredCategories();

  // Get grouped categories for "all" view
  const getGroupedCategories = () => {
    const rootCategories = categories
      .filter((cat) => cat.parent_id === null)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    return rootCategories.map((rootCat) => ({
      parent: rootCat,
      subcategories: categories
        .filter((cat) => cat.parent_id === rootCat.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    }));
  };

  const groupedCategories = getGroupedCategories();

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

  // Toggle expanded state for parent categories
  const toggleCategoryExpanded = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
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
        {filterParent === "all" ? (
          // Grouped view for "All Categories"
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleParentCategoryDragEnd(event)}
          >
            <SortableContext
              items={groupedCategories.map((group) => group.parent.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-8">
                {groupedCategories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/60 text-lg">No categories found</p>
                  </div>
                )}
                
                {groupedCategories.map((group) => {
                  const isExpanded = expandedCategories.has(group.parent.id);
                  const hasSubcategories = group.subcategories.length > 0;
                  
                  return (
                    <ParentCategoryCard
                      key={group.parent.id}
                      group={group}
                      isExpanded={isExpanded}
                      hasSubcategories={hasSubcategories}
                      toggleCategoryExpanded={toggleCategoryExpanded}
                      openEditModal={openEditModal}
                      setDeleteConfirmId={setDeleteConfirmId}
                      getParentName={getParentName}
                      getSubcategoryCount={getSubcategoryCount}
                      handleSubcategoryDragEnd={handleSubcategoryDragEnd}
                      sensors={sensors}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          // Single list view for filtered categories
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
                  <CategoryItem
                    key={category.id}
                    category={category}
                    onEdit={openEditModal}
                    onDelete={setDeleteConfirmId}
                    getParentName={getParentName}
                    getSubcategoryCount={getSubcategoryCount}
                  />
                ))}

                {filteredCategories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/60 text-lg">No categories found</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
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
