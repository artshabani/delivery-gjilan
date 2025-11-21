"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import { motion } from "framer-motion";
import Link from "next/link";
import { fetchAvailableProducts } from "@/lib/productFetch";

export default function ProductsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);

  const [activeLevel1, setActiveLevel1] = useState(0);
  const [activeLevel2, setActiveLevel2] = useState(0);

  const [search, setSearch] = useState("");
  const [visibleSubCount, setVisibleSubCount] = useState(8);

  const [isAdmin, setIsAdmin] = useState(false);

  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /* ---------------- WAIT FOR USER ID ---------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      const uid = localStorage.getItem("dg_user_id");
      if (uid) {
        setUserId(uid);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- CHECK ADMIN ---------------- */
  useEffect(() => {
    if (!userId) return;

    async function checkAdmin() {
      const { data } = await supabase
        .from("user_profiles")
        .select("is_admin")
        .eq("id", userId)
        .single();

      setIsAdmin(data?.is_admin === true);
    }

    checkAdmin();
  }, [userId]);

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

  useEffect(() => setVisibleSubCount(8), [subCats.length]);

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
      top: el.offsetTop - 140,
      behavior: "auto",
    });
  };

  const scrollToFirstSubOfCategory = (catId: number) => {
    const sub = subCats.find((c) => c.parent_id === catId);
    if (sub) scrollToSubcategory(sub.id);
  };

  /* ---------------- LOADING ---------------- */
  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        Preparing your session…
      </div>
    );
  }

  if (loading)
    return (
      <div className="min-h-screen bg-black text-white p-4">
        Checking store availability and loading products...
      </div>
    );

  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen w-full bg-black text-white pb-28">

      {/* NAVIGATION */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md px-3 pt-3 pb-3 shadow-lg">

        {/* LEVEL 1 */}
        <div className="flex gap-2 py-1 overflow-x-auto scrollbar-hide md:flex-wrap">
          <button
            onClick={() => {
              setActiveLevel1(0);
              setActiveLevel2(0);
              window.scrollTo({ top: 0, behavior: "auto" });
            }}
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm whitespace-nowrap ${
              activeLevel1 === 0
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-white/60"
            }`}
          >
            All products
          </button>

          {level1Cats.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveLevel1(cat.id);
                scrollToFirstSubOfCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-full text-xs md:text-sm whitespace-nowrap ${
                activeLevel1 === cat.id
                  ? "bg-purple-600 text-white"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* LEVEL 2 */}
        <div className="overflow-x-auto scrollbar-hide mt-1 md:overflow-visible">
          <div className="flex gap-4 px-1 md:flex-wrap">
            {currentLevel2Tabs.map((sub) => (
              <button
                key={sub.id}
                onClick={() => scrollToSubcategory(sub.id)}
                className={`relative text-xs md:text-sm whitespace-nowrap ${
                  activeLevel2 === sub.id
                    ? "text-purple-300 font-semibold"
                    : "text-white/60"
                }`}
              >
                {sub.name}
                <span
                  className={`absolute bottom-0 left-0 h-[2px] w-full bg-purple-500 rounded-full transition-transform duration-300 ${
                    activeLevel2 === sub.id ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* SEARCH */}
        <div className="w-full flex justify-center mt-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-[65%] sm:w-[50%] px-3 py-2 text-sm rounded-xl bg-white/10 text-white placeholder-white/40 border border-purple-500/40 focus:border-purple-500/70 focus:bg-white/5 transition"
          />
        </div>
      </div>

      {/* ADMIN / USER */}
      <div className="flex justify-center gap-3 mt-3">
        {isAdmin ? (
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

      {/* MAIN CONTENT */}
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-5 md:px-6 lg:px-8 mt-4">
        {visibleSubCats.map((sub) => {
          const subProducts = filterProducts(
            products.filter((p) => p.category_id === sub.id)
          );

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
              <h2 className="text-xl font-semibold mb-3">{sub.name}</h2>

              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: { staggerChildren: 0.06 },
                  },
                }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              >
                {subProducts.map((p) => (
                  <motion.div
                    key={p.id}
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
                  >
                    <ProductCard {...p} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          );
        })}

        <div ref={sentinelRef} className="h-10" />
      </div>
    </div>
  );
}
