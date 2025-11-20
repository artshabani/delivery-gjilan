"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "lucide-react";
import React from "react"; 

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  
 
  async function load() {
    setLoading(true);

    // FIX 1: The query is now stabilized. 
    // - 'product:products(*)' works after dropping the ambiguous constraint.
    // - 'restaurant_item:restaurant_items!fk_rest_item(*)' uses the confirmed foreign key name.
    const { data, error } = await supabase
      .from("orders")
      .select('*,user:user_profiles(id,first_name,last_name),order_items(*,product:products(*),restaurant_item:restaurant_items!fk_rest_item(*))')
      .order(sortCol, { ascending: sortDir === "asc" });

    if (error) {
      // This should no longer show PGRST errors after the DB fix
      console.error("❌ SUPABASE ERROR:", error);
    } else {
      console.log("✅ DATA RECEIVED:", data);
      setOrders(data || []);
    }

    setLoading(false);
  }

  /* ---------------------------------------------
     REALTIME LISTENER
  --------------------------------------------- */
  useEffect(() => {
    load();

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortCol, sortDir]);

  /* ---------------------------------------------
     UPDATE ORDER STATUS (Optimistic Update)
  --------------------------------------------- */
  async function updateStatus(id: string, status: string) {
    // 1. Optimistic Update (Update UI instantly)
    setOrders(prevOrders =>
      prevOrders.map(o => (o.id === id ? { ...o, status: status } : o))
    );

    // 2. Network Update (Update Database)
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    
    if (error) {
      console.error("Failed to update status in DB:", error);
    }
  }
  function changeSort(column: string) {
    if (sortCol === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(column);
      setSortDir("desc");
    }
  }

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  if (loading) {
    return (
      <div className="p-10 text-center text-white/70">Loading orders…</div>
    );
  }

  // Calculate stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-900">
      {/* NAVIGATION BUTTONS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/admin/products"
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition"
        >
          🛒 Products Dashboard
        </a>
        <a
          href="/admin/users"
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition"
        >
          👥 Users Dashboard
        </a>
        <a
          href="/products"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition"
        >
          🛍️ Customer Products Page
        </a>
      </div>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Orders Dashboard</h1>
        <p className="text-gray-400">Manage and track all customer orders</p>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <p className="text-gray-400 text-sm mb-1">Total Orders</p>
          <p className="text-2xl font-bold text-white">{totalOrders}</p>
        </div>
        <div className="bg-red-900/30 rounded-lg p-4 border border-red-800/50">
          <p className="text-red-300 text-sm mb-1">Pending</p>
          <p className="text-2xl font-bold text-red-400">{pendingOrders}</p>
        </div>
        <div className="bg-green-900/30 rounded-lg p-4 border border-green-800/50">
          <p className="text-green-300 text-sm mb-1">Delivered</p>
          <p className="text-2xl font-bold text-green-400">{deliveredOrders}</p>
        </div>
        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-800/50">
          <p className="text-blue-300 text-sm mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-400">€{totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="overflow-x-auto rounded-xl bg-slate-900 border border-slate-700 shadow-lg">
        <table className="w-full text-left">
          <thead className="bg-slate-800/80 text-white/90 text-sm">
            <tr>
              <th
                className="py-4 px-6 cursor-pointer select-none hover:bg-slate-700/50 transition"
                onClick={() => changeSort("created_at")}
              >
                <div className="flex items-center gap-2">
                  Time
                  {sortCol === "created_at" &&
                    (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </div>
              </th>

              <th className="py-4 px-6">Customer</th>

              <th
                className="py-4 px-6 cursor-pointer select-none hover:bg-slate-700/50 transition"
                onClick={() => changeSort("total")}
              >
                <div className="flex items-center gap-2">
                  Total
                  {sortCol === "total" &&
                    (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                </div>
              </th>

              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Items</th>
              <th className="py-4 px-6 text-center">Details</th>
            </tr>
          </thead>

          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <React.Fragment key={o.id}>
                  <tr
                    className="border-t border-slate-700/50 hover:bg-slate-800/30 transition"
                  >
                    <td className="py-4 px-6 text-white/90">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(o.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(o.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <div className="text-white/90 font-medium">
                        {o.user?.first_name || "Unknown"} {o.user?.last_name || ""}
                      </div>
                      {o.user?.email && (
                        <div className="text-xs text-gray-400">{o.user.email}</div>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <span className="text-white font-bold text-lg">
                        €{o.total?.toFixed(2) || "0.00"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <select
                        value={o.status || "pending"}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-sm cursor-pointer transition ${
                          o.status === 'pending'
                            ? 'bg-red-600/80 hover:bg-red-600 text-white border border-red-500'     
                            : 'bg-green-600/80 hover:bg-green-600 text-white border border-green-500'   
                        }`}
                      >
                        <option value="pending" className="bg-slate-700 text-white">Pending</option>
                        <option value="delivered" className="bg-slate-700 text-white">Delivered</option>
                      </select>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-700 text-white font-semibold text-sm">
                        {o.order_items?.length || 0}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() =>
                          setExpanded(expanded === o.id ? null : o.id)
                        }
                        className="p-2 rounded-lg hover:bg-slate-700 transition text-white"
                        aria-label={expanded === o.id ? "Collapse" : "Expand"}
                      >
                        {expanded === o.id ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                    </td>
                  </tr>

                  {expanded === o.id && (
                    <tr className="bg-slate-800/60 border-t border-slate-700">
                      <td colSpan={6} className="px-6 py-6">
                        <div className="space-y-3">
                          <h3 className="text-white font-semibold mb-4 text-lg">Order Items</h3>
                          <div className="grid gap-3">
                            {o.order_items?.map((item: any) => {
                              const product = item.product || item.restaurant_item;
                              const itemTotal = (item.price || 0) * (item.quantity || 1);

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 bg-slate-900/80 rounded-lg p-4 border border-slate-700 hover:bg-slate-900 transition"
                                >
                                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                    {product?.image_url ? (
                                      <Image
                                        src={product.image_url}
                                        alt={product.name || "Item"}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                        No Image
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-base mb-1">
                                      {product?.name || "Unknown item"}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm">
                                      <span className="text-gray-400">
                                        Quantity: <span className="text-white font-medium">{item.quantity || 0}</span>
                                      </span>
                                      <span className="text-gray-400">
                                        Unit Price: <span className="text-white font-medium">€{item.price?.toFixed(2) || "0.00"}</span>
                                      </span>
                                    </div>
                                    {item.notes && item.notes !== "EMPTY" && item.notes.trim() && (
                                      <p className="text-blue-300 text-sm mt-2 italic">
                                        Note: {item.notes}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <p className="text-white font-bold text-lg">
                                      €{itemTotal.toFixed(2)}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      {item.quantity || 0} × €{item.price?.toFixed(2) || "0.00"}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                            <div className="text-right">
                              <p className="text-gray-400 text-sm mb-1">Order Total</p>
                              <p className="text-white font-bold text-2xl">
                                €{o.total?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}