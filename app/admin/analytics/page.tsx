"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AdminGuard from "@/components/admin/AdminGuard";
import { supabase } from "@/lib/supabase";

interface Order {
  id: string;
  user_id: string;
  total: number;
  created_at: string;
  status: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price: number;
  item_type: string;
  product?: {
    name: string;
    image_url: string;
  };
  restaurant_item?: {
    name: string;
    image_url: string;
  };
}

interface ProfitData {
  orderProfit: number;
  itemProfits: Array<{
    itemName: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

type FilterType = "day" | "week" | "month" | "year";

export default function AnalyticsDashboard() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [topGroceryProducts, setTopGroceryProducts] = useState<Array<{ name: string; quantity: number; image?: string }>>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [orderProfits, setOrderProfits] = useState<Record<string, ProfitData>>({});
  const [selectedOrderModal, setSelectedOrderModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transportationFee, setTransportationFee] = useState<number>(0);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch orders and users in parallel
        const [ordersRes, usersRes, itemsRes] = await Promise.all([
          supabase
            .from("orders")
            .select("id, user_id, total, created_at, status")
            .order("created_at", { ascending: false }),
          supabase.rpc("list_users_with_profiles"),
          supabase
            .from("order_items")
            .select("quantity, item_type, product:products(name, image_url)")
            .eq("item_type", "grocery"), // Only grocery items
        ]);

        if (ordersRes.error) {
          console.error("Orders error:", ordersRes.error);
        } else {
          setAllOrders(ordersRes.data || []);
        }

        if (usersRes.error) {
          console.error("Users error:", usersRes.error);
        } else {
          setUsers(usersRes.data || []);
        }

        // Process grocery items only
        if (itemsRes.error) {
          console.error("Items error:", itemsRes.error);
          setTopGroceryProducts([]);
        } else {
          const items = itemsRes.data || [];
          const productMap: Record<string, { quantity: number; image?: string }> = {};

          items.forEach((item: any) => {
            if (item.product?.name) {
              if (!productMap[item.product.name]) {
                productMap[item.product.name] = { quantity: 0, image: item.product.image_url };
              }
              productMap[item.product.name].quantity += item.quantity || 1;
            }
          });

          const sortedProducts = Object.entries(productMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 12);

          setTopGroceryProducts(sortedProducts);
        }
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch transportation fee
  useEffect(() => {
    const fetchTransportationFee = async () => {
      try {
        const { data } = await supabase
          .from("site_status")
          .select("transportation_fee")
          .single();
        
        if (data) {
          setTransportationFee(data.transportation_fee || 0);
        }
      } catch (error) {
        console.error("Error fetching transportation fee:", error);
      }
    };

    fetchTransportationFee();
  }, []);

  // Calculate profit for all orders in filteredOrders
  useEffect(() => {
    const calculateAllProfits = async () => {
      const profits: Record<string, ProfitData> = {};
      
      for (const order of filteredOrders) {
        if (orderProfits[order.id]) continue; // Skip if already calculated
        
        const { data: items } = await supabase
          .from("order_items")
          .select("id, quantity, price, item_type, product_id, product:products(name, image_url), restaurant_item:restaurant_items!fk_rest_item(name, image_url)")
          .eq("order_id", order.id);

        if (!items) continue;

        let totalOrderProfit = 0;
        const itemProfits: Array<{
          itemName: string;
          quantity: number;
          revenue: number;
          cost: number;
          profit: number;
        }> = [];

        for (const item of items) {
          const productName = Array.isArray((item as any).product)
            ? (item as any).product[0]?.name
            : (item as any).product?.name;
          const restaurantName = Array.isArray((item as any).restaurant_item)
            ? (item as any).restaurant_item[0]?.name
            : (item as any).restaurant_item?.name;

          if (item.item_type === "grocery" && item.product_id) {
            const { data: costData } = await supabase
              .from("product_store_costs")
              .select("wholesale_price")
              .eq("product_id", item.product_id)
              .eq("store_id", 28)
              .single();

            const wholesalePrice = costData?.wholesale_price || 0;
            const revenue = item.price * item.quantity;
            const cost = wholesalePrice * item.quantity;
            const profit = revenue - cost;

            totalOrderProfit += profit;

            itemProfits.push({
              itemName: productName || "Unknown",
              quantity: item.quantity,
              revenue,
              cost,
              profit,
            });
          } else {
            itemProfits.push({
              itemName: restaurantName || "Unknown",
              quantity: item.quantity,
              revenue: item.price * item.quantity,
              cost: 0,
              profit: 0,
            });
          }
        }

        profits[order.id] = {
          orderProfit: totalOrderProfit,
          itemProfits,
        };
      }
      
      if (Object.keys(profits).length > 0) {
        setOrderProfits(prev => ({ ...prev, ...profits }));
      }
    };

    calculateAllProfits();
  }, [allOrders]);

  // Fetch order items and calculate profit for a specific order
  const fetchOrderItemsAndProfit = async (orderId: string) => {
    if (orderItems[orderId]) {
      return; // Already fetched
    }

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, quantity, price, item_type, product_id, product:products(name, image_url), restaurant_item:restaurant_items!fk_rest_item(name, image_url)")
        .eq("order_id", orderId);

      if (error) {
        console.error("Error fetching order items:", error);
        setOrderItems(prev => ({ ...prev, [orderId]: [] }));
        return;
      }

      const items = data || [];
      setOrderItems(prev => ({ ...prev, [orderId]: items }));

      // Calculate profit for each item
      let totalOrderProfit = 0;
      const itemProfits: Array<{
        itemName: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
      }> = [];

      for (const item of items) {
        if (item.item_type === "grocery" && item.product_id) {
          // Fetch wholesale price
          const { data: costData } = await supabase
            .from("product_store_costs")
            .select("wholesale_price")
            .eq("product_id", item.product_id)
            .eq("store_id", 28)
            .single();

          const wholesalePrice = costData?.wholesale_price || 0;
          const revenue = item.price * item.quantity;
          const cost = wholesalePrice * item.quantity;
          const profit = revenue - cost;

          totalOrderProfit += profit;

          itemProfits.push({
            itemName: item.product?.name || "Unknown",
            quantity: item.quantity,
            revenue,
            cost,
            profit,
          });
        } else {
          // Restaurant items have no profit tracking
          itemProfits.push({
            itemName: item.restaurant_item?.name || "Unknown",
            quantity: item.quantity,
            revenue: item.price * item.quantity,
            cost: 0,
            profit: 0,
          });
        }
      }

      setOrderProfits(prev => ({
        ...prev,
        [orderId]: {
          orderProfit: totalOrderProfit,
          itemProfits,
        },
      }));
    } catch (error) {
      console.error("Failed to fetch order items:", error);
      setOrderItems(prev => ({ ...prev, [orderId]: [] }));
    }
  };

  // Get filtered orders
  const filteredOrders = useMemo(() => {
    let orders = allOrders;

    // Filter by user
    if (selectedUserId) {
      orders = orders.filter((o) => o.user_id === selectedUserId);
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      orders = orders.filter((o) => new Date(o.created_at) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => new Date(o.created_at) <= toDate);
    }

    return orders;
  }, [allOrders, selectedUserId, dateFrom, dateTo]);

  // Get orders grouped by date/week/month/year
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};

    filteredOrders.forEach((order) => {
      const date = new Date(order.created_at);
      let key: string;

      if (filterType === "day") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      } else if (filterType === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `Week of ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      } else if (filterType === "month") {
        key = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      } else {
        key = date.getFullYear().toString();
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });

    return groups;
  }, [filteredOrders, filterType]);

  // Period data with profit
  const periodData = useMemo(() => {
    return Object.entries(groupedOrders)
      .map(([label, orders]) => {
        const revenue = orders.reduce((sum, o) => sum + o.total, 0);
        const profit = orders.reduce((sum, o) => {
          return sum + (orderProfits[o.id]?.orderProfit || 0);
        }, 0);
        
        return {
          label,
          orders,
          orderCount: orders.length,
          revenue: parseFloat(revenue.toFixed(2)),
          profit: parseFloat(profit.toFixed(2)),
        };
      })
      .reverse(); // Most recent first
  }, [groupedOrders, orderProfits]);

  // Total stats with profit - based on FILTERED orders
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const deliveredOrders = filteredOrders.filter((o) => o.status === "delivered").length;
    
    // Calculate total profit from orders we have profit data for
    const totalProfit = Object.values(orderProfits).reduce((sum, p) => sum + p.orderProfit, 0);
    const avgProfit = Object.keys(orderProfits).length > 0 ? totalProfit / Object.keys(orderProfits).length : 0;
    
    // Calculate transportation profit (transportation fee × number of orders)
    const transportationProfit = transportationFee * totalOrders;

    return {
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
      deliveredOrders,
      totalProfit: totalProfit.toFixed(2),
      avgProfit: avgProfit.toFixed(2),
      transportationProfit: transportationProfit.toFixed(2),
    };
  }, [filteredOrders, orderProfits, transportationFee]);

  // Filter users for search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return [];
    const search = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.first_name?.toLowerCase().includes(search) ||
        u.last_name?.toLowerCase().includes(search) ||
        u.email?.toLowerCase().includes(search)
    );
  }, [users, userSearch]);

  if (loading) {
    return <p className="p-6 text-gray-200">Loading analytics…</p>;
  }

  return (
    <AdminGuard>
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
          href="/admin/categories"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-yellow-500/50 hover:scale-105"
        >
          <span className="text-xl">🏷️</span>
          <span>Categories</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">📊 Analytics</h1>
        <p className="text-white/60">Order performance and trends</p>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-slate-800/40 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-xs mb-1">Orders</p>
          <p className="text-2xl font-bold text-blue-400">{stats.totalOrders}</p>
        </div>
        <div className="bg-slate-800/40 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-xs mb-1">Revenue</p>
          <p className="text-2xl font-bold text-green-400">€{stats.totalRevenue}</p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-emerald-300/70 text-xs mb-1">💰 Product Profit</p>
          <p className="text-2xl font-bold text-emerald-400">€{stats.totalProfit}</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300/70 text-xs mb-1">🚗 Transport Profit</p>
          <p className="text-2xl font-bold text-blue-400">€{stats.transportationProfit}</p>
        </div>
        <div className="bg-slate-800/40 border border-white/10 rounded-lg p-4">
          <p className="text-white/50 text-xs mb-1">Avg Order</p>
          <p className="text-2xl font-bold text-purple-400">€{stats.avgOrderValue}</p>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="bg-slate-800/40 border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Group by */}
          <div className="flex-shrink-0">
            <label className="text-xs text-white/60 mb-2 block">Group By</label>
            <div className="flex gap-1">
              {(["day", "week", "month", "year"] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all ${
                    filterType === type
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700/50 text-white/70 hover:bg-slate-700"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Date From */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-white/60 mb-2 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-700/50 border border-white/10 rounded text-white text-sm focus:border-blue-500/50 focus:outline-none transition"
            />
          </div>

          {/* Date To */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-white/60 mb-2 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-700/50 border border-white/10 rounded text-white text-sm focus:border-blue-500/50 focus:outline-none transition"
            />
          </div>

          {/* Clear Filters */}
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="px-3 py-1.5 bg-red-600/20 border border-red-600/40 text-red-400 rounded text-xs hover:bg-red-600/30 transition"
            >
              Clear Dates
            </button>
          )}
        </div>
      </div>

      {/* Orders by Period - Simple Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Orders by {filterType.charAt(0).toUpperCase() + filterType.slice(1)}</h2>
        <div className="space-y-2">
          {periodData.length > 0 ? (
            periodData.map((period) => {
              const isExpanded = expandedPeriod === period.label;
              return (
                <div key={period.label}>
                  <button
                    onClick={() => setExpandedPeriod(isExpanded ? null : period.label)}
                    className="w-full bg-slate-800/40 border border-white/10 hover:border-white/20 rounded p-3 transition text-left flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{period.label}</p>
                      <p className="text-white/60 text-xs mt-1">{period.orderCount} orders • €{period.revenue.toFixed(2)} • 💰 €{period.profit.toFixed(2)}</p>
                    </div>
                    <span className="text-white/40 text-lg ml-4">{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-900/30 border-l border-r border-b border-white/5 rounded-b p-3 space-y-2">
                      {period.orders.map((order) => {
                        const user = users.find(u => u.id === order.user_id);
                        const profit = orderProfits[order.id]?.orderProfit || 0;
                        return (
                          <button
                            key={order.id}
                            onClick={() => {
                              setSelectedOrderModal(order.id);
                              fetchOrderItemsAndProfit(order.id);
                            }}
                            className="w-full bg-slate-800/20 border border-white/5 hover:border-white/10 rounded p-2 transition text-left text-xs"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-medium">{user?.first_name} {user?.last_name}</p>
                                <p className="text-white/50">{new Date(order.created_at).toLocaleTimeString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-semibold">€{order.total.toFixed(2)}</p>
                                {profit > 0 && <p className="text-emerald-400 text-xs">💰 +€{profit.toFixed(2)}</p>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-white/60 text-center py-8">No orders found</p>
          )}
        </div>
      </div>

      {/* Top Selling Grocery Products - Very Small */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white mb-3">🛍️ Top Grocery Products</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {topGroceryProducts.slice(0, 8).map((item, idx) => (
            <div key={idx} className="flex-shrink-0 w-16 h-20 bg-slate-800/40 border border-white/10 rounded overflow-hidden hover:border-white/20 transition">
              <div className="w-full h-12 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-sm">
                {item.image && item.image.startsWith("http") ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span>🛒</span>
                )}
              </div>
              <div className="p-1 text-center">
                <p className="text-white font-bold text-xs">{item.quantity}</p>
              </div>
            </div>
          ))}
          {topGroceryProducts.length === 0 && (
            <p className="text-white/60 text-xs">No products sold</p>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800/80 backdrop-blur-sm border-b border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Order Details</h3>
                  <p className="text-white/60 text-sm">#{selectedOrderModal.slice(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedOrderModal(null)}
                  className="text-white/60 hover:text-white text-2xl transition"
                >
                  ✕
                </button>
              </div>
              
              {/* Order Profit Summary */}
              {orderProfits[selectedOrderModal] && (
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-300 text-sm font-semibold">Total Order Profit</p>
                      <p className="text-emerald-200 text-xs mt-1">Revenue - Cost</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">
                      💰 €{orderProfits[selectedOrderModal].orderProfit.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {orderItems[selectedOrderModal] && orderItems[selectedOrderModal].length > 0 ? (
                orderItems[selectedOrderModal].map((item: OrderItem, idx: number) => {
                  const itemProfit = orderProfits[selectedOrderModal]?.itemProfits.find(
                    (p) => p.itemName === (item.product?.name || item.restaurant_item?.name)
                  );
                  
                  return (
                    <div key={idx} className="bg-slate-800/40 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition">
                      <div className="flex gap-4">
                        {/* Item Image */}
                        <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                          {item.product?.image_url && item.product.image_url.startsWith("http") ? (
                            <img 
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : item.restaurant_item?.image_url && item.restaurant_item.image_url.startsWith("http") ? (
                            <img 
                              src={item.restaurant_item.image_url}
                              alt={item.restaurant_item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl">{item.item_type === "restaurant" ? "🍽️" : "🛒"}</span>
                          )}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-white font-semibold text-lg">
                              {item.product?.name || item.restaurant_item?.name || "Unknown Item"}
                            </p>
                            {itemProfit && itemProfit.profit > 0 && (
                              <span className="text-emerald-400 text-sm font-semibold bg-emerald-900/30 px-2 py-1 rounded">
                                +€{itemProfit.profit.toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          {item.item_type === "restaurant" && (
                            <p className="text-white/60 text-sm mb-3">🍽️ Restaurant Item (No profit tracking)</p>
                          )}
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-white/60">Quantity:</span>
                              <span className="text-white font-semibold ml-2">{item.quantity}×</span>
                            </div>
                            <div>
                              <span className="text-white/60">Revenue:</span>
                              <span className="text-green-400 font-semibold ml-2">€{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {itemProfit && (
                              <>
                                <div>
                                  <span className="text-white/60">Cost:</span>
                                  <span className="text-red-400 font-semibold ml-2">€{itemProfit.cost.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-white/60">Profit:</span>
                                  <span className="text-emerald-400 font-semibold ml-2">€{itemProfit.profit.toFixed(2)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-white/60 text-center py-8">Loading order items...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}