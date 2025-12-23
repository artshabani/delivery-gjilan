"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, UtensilsCrossed, Store } from "lucide-react";
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
  // Prevent observer thrashing during programmatic scrolls
  const isAutoScrollingRef = useRef(false);

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

    // Update UI immediately - merge with other categories and update sort_order locally
    const otherProducts = products.filter((p) => p.category_id !== categoryId);
    const reindexed = newOrder.map((p, idx) => ({ ...p, sort_order: idx }));
    setProducts([...otherProducts, ...reindexed]);

    // Prepare order data with new sequential sort_order values (0..n-1)
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

    // Listen for category changes (reordering, updates)
    const categoryChannel = supabase
      .channel("category_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "product_categories",
        },
        () => {
          // Reload categories when they change
          const reloadCategories = async () => {
            const { data: catData } = await supabase
              .from("product_categories")
              .select("*")
              .order("sort_order");
            setCategories(catData || []);
          };
          reloadCategories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storeStatusChannel);
      supabase.removeChannel(categoryChannel);
    };
  }, [userId]);

  /* ---------------- CATEGORY LOGIC ---------------- */
  const level1Cats = useMemo(() => 
    categories.filter((c) => c.parent_id === null).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [categories]
  );
  const subCatsRaw = categories.filter((c) => c.parent_id !== null);

  const subCats = useMemo(
    () =>
      [...subCatsRaw].sort((a, b) => {
        // First get the parent categories and their sort orders
        const parentA = level1Cats.find(cat => cat.id === a.parent_id);
        const parentB = level1Cats.find(cat => cat.id === b.parent_id);
        
        const parentOrderA = parentA?.sort_order ?? 999;
        const parentOrderB = parentB?.sort_order ?? 999;
        
        // Sort by parent category order first
        if (parentOrderA !== parentOrderB) {
          return parentOrderA - parentOrderB;
        }
        
        // Then by subcategory sort_order within the same parent
        if (a.sort_order !== b.sort_order)
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        return (a.id as number) - (b.id as number);
      }),
    [subCatsRaw, level1Cats]
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
        // Ignore observer updates while we're scrolling via navigation
        if (isAutoScrollingRef.current) return;
        
        // Find the section that's most visible in the viewport center
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (!intersecting.length) return;

        // Get the section closest to the top of the visible area
        const mostVisible = intersecting.reduce((closest, current) => {
          const closestDistance = Math.abs(closest.boundingClientRect.top);
          const currentDistance = Math.abs(current.boundingClientRect.top);
          return currentDistance < closestDistance ? current : closest;
        });

        const subId = Number(mostVisible.target.getAttribute("data-subcat"));
        const parentId = Number(mostVisible.target.getAttribute("data-parent"));

        if (parentId && parentId !== activeLevel1) {
          setActiveLevel1(parentId);
        }
        if (subId && subId !== activeLevel2) {
          setActiveLevel2(subId);
        }
      },
      { 
        rootMargin: "-20% 0px -70% 0px", // More responsive - top 30% of viewport
        threshold: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1] // Multiple thresholds for better detection
      }
    );

    // Observe all rendered sections
    visibleSubCats.forEach((sub) => {
      const el = sectionRefs.current[sub.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [visibleSubCats, activeLevel1, activeLevel2]); // Removed search/products to reduce re-init

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
    isAutoScrollingRef.current = true;
    // Instant jump instead of smooth scroll
    window.scrollTo({
      top: el.offsetTop - 160,
      behavior: "auto",
    });
    // Shorter suppression for instant navigation
    window.setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 100);
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
      <div className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto w-full px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kerko produkte..."
              className="w-full h-12 pl-12 pr-4 rounded-full bg-[#222] text-white placeholder-white/70 border border-[#2f2f2f] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 outline-none shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
            />
          </div>

          {/* LEVEL 1 - Main Categories */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 md:flex-wrap border-b border-[#1f1f1f] pb-2">
            {[{ id: 0, name: "Të gjitha artikujt" }, ...level1Cats].map((cat) => {
              const isActive = activeLevel1 === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveLevel1(cat.id as number);
                    if (cat.id === 0) {
                      setActiveLevel2(0);
                      window.scrollTo({ top: 0, behavior: "auto" });
                    } else {
                      const firstSub = subCats.find((c) => c.parent_id === (cat.id as number));
                      if (firstSub) {
                        // Ensure the target subcategory is within visible range
                        const subIndex = subCats.findIndex((c) => c.id === firstSub.id);
                        if (subIndex >= visibleSubCount) {
                          setVisibleSubCount(subIndex + 5); // Load a few extra
                        }
                        setActiveLevel2(firstSub.id as number);
                        // Use setTimeout to ensure DOM is updated before scrolling
                        setTimeout(() => scrollToSubcategory(firstSub.id as number), 0);
                      }
                    }
                  }}
                  className={`relative flex-shrink-0 pb-2 text-[12px] sm:text-sm font-semibold tracking-wide uppercase transition-colors ${
                    isActive ? "text-cyan-400" : "text-white/75 hover:text-cyan-300"
                  }`}
                >
                  {cat.name}
                  {isActive && (
                    <span className="absolute -bottom-[10px] left-0 right-0 h-[3px] rounded-full bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* LEVEL 2 - Subcategories */}
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 md:flex-wrap pt-1">
            {currentLevel2Tabs.length > 0 && (
              <span className="text-[#2f2f2f] select-none">|</span>
            )}
            {currentLevel2Tabs.map((sub) => {
              const isActive = activeLevel2 === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    // Ensure the target subcategory is within visible range
                    const subIndex = subCats.findIndex((c) => c.id === sub.id);
                    if (subIndex >= visibleSubCount) {
                      setVisibleSubCount(subIndex + 5); // Load a few extra
                    }
                    setActiveLevel2(sub.id as number);
                    // Use setTimeout to ensure DOM is updated before scrolling
                    setTimeout(() => scrollToSubcategory(sub.id as number), 0);
                    const parentId = sub.parent_id ?? null;
                    if (parentId) setActiveLevel1(parentId);
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition ${
                    isActive
                      ? "bg-cyan-500/90 border-cyan-400 text-black"
                      : "bg-[#111] border-[#1f1f1f] text-white/80 hover:border-cyan-500/40"
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Back control removed for simplified flow */}

      {/* Admin Debug Indicator (Temporary) */}
      {/* <div className="fixed top-20 right-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        Admin: {isAdminGuard ? "YES" : "NO"}
      </div> */}

      {/* NEW PRODUCTS BANNER */}
      <div className="w-full max-w-[1100px] mx-auto px-4 mt-4 mb-2">
        <div className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 border border-blue-500/20 rounded-lg py-2 px-4 text-center">
          <p className="text-white/80 text-xs sm:text-sm">
            ✨ <span className="font-semibold">Jemi duke shtuar te reja gjdo dite. Cmimet jane akoma promocionale!</span>
          </p>
        </div>
      </div>

      {/* PRIMARY NAV SHORTCUTS + ADMIN/USER ACTIONS */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
          {[{ label: "Restoranet", href: "/restaurants", icon: UtensilsCrossed }, { label: "Marketi", href: "/products", icon: Store }].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.href === "/products";
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition shadow-sm ${
                  isActive
                    ? "bg-cyan-500 text-black border-cyan-400"
                    : "bg-[#1a1a1a] border-[#2a2a2a] text-white/85 hover:border-cyan-500/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex justify-center gap-3">
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
          ) : null}
        </div>
      </div>

      {/* CIGARETTES CAROUSEL - Show first (hidden when searching) */}
      {!search.trim() && (() => {
        const cigaretteProducts = products.filter((p) => {
          const cat = categories.find((c) => c.id === p.category_id);
          // Include products from categories or subcategories with "cigare" in the name
          if (cat?.name?.toLowerCase().includes('cigare')) return true;
          // Check if parent category includes "cigare"
          if (cat?.parent_id) {
            const parentCat = categories.find((c) => c.id === cat.parent_id);
            return parentCat?.name?.toLowerCase().includes('cigare');
          }
          return false;
        }).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        
        return cigaretteProducts.length > 0 ? (
          <div className="w-full max-w-[1100px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 mt-6 mb-2">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚬</span>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-400 via-slate-300 to-gray-500 bg-clip-text text-transparent">
                  Cigaret
                </h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-500/50 to-transparent" />
            </div>

            {/* Carousel */}
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-3 sm:gap-4 pb-2">
                  {cigaretteProducts.map((p) => (
                    <div 
                      key={`cigarette-${p.id}`} 
                      className="flex-shrink-0 w-[160px] sm:w-[170px] h-[240px] transform transition-transform hover:scale-105"
                    >
                      <ProductCard {...p} compact />
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
        ) : null;
      })()}

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
            const aSale = a.is_on_sale && a.sale_price != null ? 0 : 1; // sale first
            const bSale = b.is_on_sale && b.sale_price != null ? 0 : 1;
            if (aSale !== bSale) return aSale - bSale;
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
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
