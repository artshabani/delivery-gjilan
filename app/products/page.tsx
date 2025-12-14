"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import { motion } from "framer-motion";
import Link from "next/link";
import { fetchAvailableProducts } from "@/lib/productFetch";
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
import toast from "react-hot-toast";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("dg_user_id") : null
  );

  const [activeLevel1, setActiveLevel1] = useState(0);
  const [activeLevel2, setActiveLevel2] = useState(0);

  const [search, setSearch] = useState("");
  const [visibleSubCount, setVisibleSubCount] = useState(8);

  // Use admin guard hook
  const { allowed: isAdminGuard } = useAdminGuard();

  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- WAIT FOR USER ID ---------------- */
  useEffect(() => {
    if (userId) return; // already set

    const interval = setInterval(() => {
      const uid = localStorage.getItem("dg_user_id");
      if (uid) {
        setUserId(uid);
        clearInterval(interval);
      }
    }, 100); // Check every 100ms for faster response

    return () => clearInterval(interval);
  }, [userId]);

  /* ---------------- DND SENSORS ---------------- */
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

  /* ---------------- HANDLE DRAG END ---------------- */
  async function handleDragEnd(event: DragEndEvent, categoryId: number) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Filter products in this category only
    const categoryProducts = products.filter((p) => p.category_id === categoryId);

    const oldIndex = categoryProducts.findIndex((p) => p.id === active.id);
    const newIndex = categoryProducts.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(categoryProducts, oldIndex, newIndex);

    // Update UI immediately - merge with other categories
    const otherProducts = products.filter((p) => p.category_id !== categoryId);
    setProducts([...otherProducts, ...newOrder]);

    // Prepare order data with new sort_order values
    const orderData = newOrder.map((product, index) => ({
      id: product.id,
      sort_order: index,
    }));

    // Send to backend
    try {
      const res = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderData }),
      });

      if (res.ok) {
        toast.success("Product order updated!");
      } else {
        toast.error("Failed to update order");
        // Reload
        const prodData = await fetchAvailableProducts();
        setProducts(prodData || []);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Error updating order");
    }
  }

  /* ---------------- FETCH PRODUCTS & CATEGORIES ---------------- */
  useEffect(() => {
    if (!userId) return; // wait for userId

    const load = async () => {
      const { data: catData } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");

      const prodData = await fetchAvailableProducts();

      setCategories(catData || []);
      setProducts(prodData || []);
      setVisibleSubCount(8);
      setLoading(false);
    };

    load();

    const storeStatusChannel = supabase
      .channel("store_status_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stores",
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storeStatusChannel);
    };
  }, [userId]);

  /* ---------------- CATEGORY LOGIC ---------------- */
  const level1Cats = categories.filter((c) => c.parent_id === null);
  const subCatsRaw = categories.filter((c) => c.parent_id !== null);

  const subCats = useMemo(
    () =>
      [...subCatsRaw].sort((a, b) => {
        if (a.parent_id !== b.parent_id)
          return (a.parent_id ?? 0) - (b.parent_id ?? 0);
        if (a.sort_order !== b.sort_order)
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        return (a.id as number) - (b.id as number);
      }),
    [subCatsRaw]
  );

  const visibleSubCats = subCats.slice(0, visibleSubCount);

  const currentCategoryId =
    activeLevel1 === 0
      ? subCats.find((c) => c.id === activeLevel2)?.parent_id ??
      level1Cats[0]?.id ??
      null
      : activeLevel1;

  const currentLevel2Tabs = currentCategoryId
    ? categories.filter((c) => c.parent_id === currentCategoryId)
    : [];

  /* ---------------- SCROLL SYNC ---------------- */
  useEffect(() => {
    if (!visibleSubCats.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (!visible) return;

        const subId = Number(visible.target.getAttribute("data-subcat"));
        const parentId = Number(visible.target.getAttribute("data-parent"));

        if (parentId) setActiveLevel1(parentId);
        if (subId) setActiveLevel2(subId);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0.1 }
    );

    visibleSubCats.forEach((sub) => {
      const el = sectionRefs.current[sub.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visibleSubCats]);

  /* ---------------- LAZY LOAD ---------------- */
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (visibleSubCount >= subCats.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleSubCount((prev) =>
            Math.min(prev + 6, subCats.length)
          );
        }
      },
      { rootMargin: "200px 0px 0px 0px", threshold: 0 }
    );

    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [visibleSubCount, subCats.length]);

  /* ---------------- HELPERS ---------------- */
  const filterProducts = (arr: Product[]) =>
    arr.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

  const scrollToSubcategory = (subId: number) => {
    const el = sectionRefs.current[subId];
    if (!el) return;
    window.scrollTo({
      top: el.offsetTop - 160,
      behavior: "smooth",
    });
  };

  // When searching, scroll to the first subcategory that has results
  useEffect(() => {
    if (!search.trim()) return;
    
    const firstWithResults = visibleSubCats.find((sub) => {
      const has = products.some((p) => p.category_id === sub.id && p.name.toLowerCase().includes(search.toLowerCase()));
      return has;
    });
    
    if (firstWithResults) {
      // Use a microtask to batch state updates
      Promise.resolve().then(() => {
        setActiveLevel2(firstWithResults.id);
        const parentId = firstWithResults.parent_id ?? null;
        if (parentId) setActiveLevel1(parentId);
      });
      scrollToSubcategory(firstWithResults.id);
    }
  }, [search, visibleSubCats, products]);

  /* ---------------- LOADING SKELETON ---------------- */
  if (!userId || loading) {
    return (
      <div className="min-h-screen w-full bg-black text-white pb-28">
        {/* SKELETON HEADER */}
        <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl px-4 pt-4 pb-4 border-b border-white/10">
          {/* Level 1 Cats Skeleton */}
          <div className="flex gap-3 py-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-28 bg-slate-800/50 rounded-xl animate-pulse flex-shrink-0"
              />
            ))}
          </div>

          {/* Level 2 Cats Skeleton */}
          <div className="mt-3 flex gap-6 px-1 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-5 w-20 bg-slate-800/50 rounded animate-pulse flex-shrink-0"
              />
            ))}
          </div>

          {/* Search Skeleton */}
          <div className="w-full flex justify-center mt-4">
            <div className="w-full max-w-md h-11 bg-slate-800/50 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* SKELETON CONTENT */}
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-5 md:px-6 lg:px-8 mt-8">
          {[1, 2].map((section) => (
            <div key={section} className="mb-10">
              {/* Section Title Skeleton */}
              <div className="h-7 w-48 bg-slate-800/50 rounded mb-4 animate-pulse" />

              {/* Grid Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((card) => (
                  <div
                    key={card}
                    className="bg-slate-900/30 rounded-2xl p-3 h-[260px] border border-slate-800/50 flex flex-col animate-pulse"
                  >
                    {/* Image Placeholder */}
                    <div className="w-full h-32 bg-slate-800/50 rounded-xl mb-3" />

                    {/* Text Placeholders */}
                    <div className="h-4 w-3/4 bg-slate-800/50 rounded mb-2" />
                    <div className="h-3 w-full bg-slate-800/30 rounded mb-1" />
                    <div className="h-3 w-1/2 bg-slate-800/30 rounded mb-4" />

                    {/* Price/Button Placeholder */}
                    <div className="mt-auto flex justify-between items-center">
                      <div className="h-5 w-16 bg-slate-800/50 rounded" />
                      <div className="h-8 w-8 bg-slate-800/50 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen w-full bg-black text-white pb-28">

      {/* NAVIGATION */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-slate-950 via-slate-900 to-black/95 backdrop-blur-xl px-3 sm:px-4 py-3 shadow-2xl border-b border-white/10">
        {/* SEARCH */}
        <div className="w-full flex justify-center mb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full max-w-xl h-11 sm:h-12 px-4 sm:px-5 rounded-xl bg-slate-900/70 text-white placeholder-white/60 border border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none"
          />
        </div>

        {/* LEVEL 1 - Main Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 md:flex-wrap">
          {[{ id: 0, name: "All" }, ...level1Cats].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveLevel1(cat.id as number);
                if (cat.id === 0) {
                  setActiveLevel2(0);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  const firstSub = subCats.find((c) => c.parent_id === (cat.id as number));
                  if (firstSub) {
                    setActiveLevel2(firstSub.id as number);
                    scrollToSubcategory(firstSub.id as number);
                  }
                }
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition border ${
                activeLevel1 === cat.id
                  ? "bg-blue-600 border-blue-500 text-white shadow"
                  : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* LEVEL 2 - Subcategories */}
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 md:flex-wrap">
          {currentLevel2Tabs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setActiveLevel2(sub.id as number);
                scrollToSubcategory(sub.id as number);
                // keep level1 synced by parent
                const parentId = sub.parent_id ?? null;
                if (parentId) setActiveLevel1(parentId);
              }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeLevel2 === sub.id
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {/* RESTAURANTS BUTTON */}
        <div className="mt-3 flex justify-center">
          <Link
            href="/restaurants"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow hover:bg-blue-700"
          >
            Restaurants
          </Link>
        </div>
      </div>

      {/* Back control removed for simplified flow */}

      {/* Admin Debug Indicator (Temporary) */}
      {/* <div className="fixed top-20 right-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        Admin: {isAdminGuard ? "YES" : "NO"}
      </div> */}

      {/* ADMIN / USER */}
      <div className="flex justify-center gap-3 mt-3">
        {isAdminGuard ? (
          <>
            <Link
              href="/admin/products"
              className="px-3 py-1 bg-purple-700 text-white rounded-lg text-sm"
            >
              Manage Products
            </Link>

            <Link
              href="/admin/users"
              className="px-3 py-1 bg-blue-700 text-white rounded-lg text-sm"
            >
              Manage Users
            </Link>
          </>
        ) : (
          <Link
            href="/restaurants"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 text-white text-sm font-semibold shadow-md hover:shadow-xl active:scale-95 transition"
          >
            Browse Restaurants
          </Link>
        )}
      </div>

      {/* ITEMS ON SALE - Horizontal carousel (hidden when searching) */}
      {!search.trim() && products.some((p) => p.is_on_sale && p.sale_price != null) && (
        <div className="w-full max-w-[1100px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-6 mb-2">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Items on Sale
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-orange-500/50 to-transparent" />
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 sm:gap-4 pb-2">
                {products
                  .filter((p) => p.is_on_sale && p.sale_price != null)
                  .map((p) => (
                    <div 
                      key={`sale-${p.id}`} 
                      className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] transform transition-transform hover:scale-105"
                    >
                      <ProductCard {...p} />
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Gradient fade on edges */}
            <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none" />
          </div>

          <div className="h-px bg-white/10 mt-4" />
        </div>
      )}

      {/* SHOP BY CATEGORY hidden */}

      {/* MAIN CONTENT */}
      <div className="w-full max-w-[1100px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-3 sm:mt-4">
        {visibleSubCats.map((sub, idx) => {
          const subProducts = filterProducts(
            products.filter((p) => p.category_id === sub.id)
          ).sort((a, b) => {
            // Show sale items first; keep original relative order otherwise
            const aSale = a.is_on_sale && a.sale_price != null;
            const bSale = b.is_on_sale && b.sale_price != null;
            if (aSale === bSale) return 0;
            return aSale ? -1 : 1;
          });

          if (!subProducts.length) return null;

          return (
            <div
              key={sub.id}
              data-subcat={sub.id}
              data-parent={sub.parent_id ?? 0}
              ref={(el) => {
                sectionRefs.current[sub.id] = el;
              }}
              className="mb-10"
            >
              {idx > 0 && <div className="h-px bg-white/10 mb-4" />}
              <h2 className="text-xl font-semibold mb-3">{sub.name}</h2>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, sub.id)}
              >
                <SortableContext
                  items={subProducts.map((p) => p.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: { staggerChildren: 0.06 },
                      },
                    }}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
                  >
                    {subProducts.map((p) => (
                      <SortableItem key={p.id} id={p.id} disabled={!isAdminGuard}>
                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 },
                          }}
                          whileHover={{
                            scale: 1.05,
                            transition: {
                              type: "spring",
                              stiffness: 300,
                              damping: 18,
                            },
                          }}
                          className="relative"
                        >
                          {isAdminGuard && (
                            <div className="absolute top-2 left-2 z-10 bg-purple-600/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-white border border-purple-500/50 shadow-lg cursor-grab active:cursor-grabbing">
                              ⋮⋮ Drag
                            </div>
                          )}
                          <ProductCard
                            {...p}
                            onClick={() => {
                              const parentId = sub.parent_id ?? null;
                              if (parentId) {
                                setActiveLevel1(parentId);
                                setActiveLevel2(sub.id);
                              }
                            }}
                          />
                        </motion.div>
                      </SortableItem>
                    ))}
                  </motion.div>
                </SortableContext>
              </DndContext>
            </div>
          );
        })}

        <div ref={sentinelRef} className="h-10" />
      </div>
    </div>
  );
}
