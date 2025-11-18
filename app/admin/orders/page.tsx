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

  return (
    <div className="p-6">
      <h1 className="text-3xl mb-6 font-bold text-white">Orders</h1>

      <div className="overflow-x-auto rounded-xl bg-slate-900 border border-white/10">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-white/70 text-sm">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer select-none"
                onClick={() => changeSort("created_at")}
              >
                Time{" "}
                {sortCol === "created_at" &&
                  (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
              </th>

              <th className="py-3 px-4">User</th>

              <th
                className="py-3 px-4 cursor-pointer select-none"
                onClick={() => changeSort("total")}
              >
                Total{" "}
                {sortCol === "total" &&
                  (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
              </th>

              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Items</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>

          <tbody>
            {orders.map((o) => (
              // FIX 2: Added key to React.Fragment to resolve console error
              <React.Fragment key={o.id}>
                <tr
                  key={o.id}
                  className="border-t border-white/5 hover:bg-slate-800/50"
                >
                  <td className="py-3 px-4 text-white/90">
                    {new Date(o.created_at).toLocaleString()}
                  </td>

                  <td className="py-3 px-4 text-white/80">
                    {o.user?.first_name} {o.user?.last_name || "Unknown"}
                  </td>

                  <td className="py-3 px-4 text-white font-semibold">
                    €{o.total.toFixed(2)}
                  </td>

                  <td className="py-3 px-4">
                      <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg font-semibold ${
                              o.status === 'pending'
                                  ? 'bg-red-700 text-white'     
                                  : 'bg-green-600 text-white'   
                          }`}
                      >
                          <option value="pending" className="bg-slate-700 text-white">Pending</option>
                          <option value="delivered" className="bg-slate-700 text-white">Delivered</option>
                      </select>
                  </td>

                  <td className="py-3 px-4 text-white/70">
                    {o.order_items?.length || 0}
                  </td>

                  <td className="py-3 px-4">
                    <button
                      onClick={() =>
                        setExpanded(expanded === o.id ? null : o.id)
                      }
                      className="text-white"
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
                  <tr className="bg-slate-800/40 border-t border-white/5">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="flex flex-col gap-3">
                        {o.order_items.map((item: any) => {
                          // The 'product' variable will now correctly receive data
                          const product =
                            item.product || item.restaurant_item;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 bg-slate-900 rounded-xl p-3"
                            >
                              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-slate-700">
                                {product?.image_url && (
                                  <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                  />
                                )}
                              </div>

                              <div className="flex flex-col">
                                <p className="text-white font-medium">
                                  {/* This line will now show the correct item name */}
                                  {product?.name || "Unknown item"}
                                </p>

                                <p className="text-white/60 text-sm">
                                  Qty: {item.quantity}
                                </p>

                                {item.notes && item.notes !== "EMPTY" && (
                                  <p className="text-blue-300 text-sm">
                                    {item.notes}
                                  </p>
                                )}
                              </div>

                              <p className="ml-auto text-white font-semibold">
                                €{item.price.toFixed(2)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}