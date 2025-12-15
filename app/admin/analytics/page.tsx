"use client";

import { useState, useEffect, useMemo } from "react";
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

type FilterType = "day" | "week" | "month" | "year";

export default function AnalyticsDashboard() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; quantity: number; image?: string }>>([]);
  const [topRestaurantItems, setTopRestaurantItems] = useState<Array<{ name: string; quantity: number; restaurantId?: string; restaurantName?: string }>>([]);
  const [topRestaurants, setTopRestaurants] = useState<Array<{ id: string; name: string; quantity: number }>>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [selectedOrderModal, setSelectedOrderModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<FilterType>("month");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

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
            .select("quantity, item_type, product:products(name, image_url), restaurant_item:restaurant_items!fk_rest_item(name)"),
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

        // Process items - separate products and restaurant items
        if (itemsRes.error) {
          console.error("Items error:", itemsRes.error);
          setTopProducts([]);
          setTopRestaurantItems([]);
          setTopRestaurants([]);
        } else {
          const items = itemsRes.data || [];
          const productMap: Record<string, { quantity: number; image?: string }> = {};
          const restaurantItemsMap: Record<string, { quantity: number }> = {};

          items.forEach((item: any) => {
            if (item.item_type === "grocery" && item.product?.name) {
              if (!productMap[item.product.name]) {
                productMap[item.product.name] = { quantity: 0, image: item.product.image_url };
              }
              productMap[item.product.name].quantity += item.quantity || 1;
            } else if (item.item_type === "restaurant" && item.restaurant_item?.name) {
              if (!restaurantItemsMap[item.restaurant_item.name]) {
                restaurantItemsMap[item.restaurant_item.name] = { quantity: 0 };
              }
              restaurantItemsMap[item.restaurant_item.name].quantity += item.quantity || 1;
            }
          });

          const sortedProducts = Object.entries(productMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 12);

          const sortedRestaurantItems = Object.entries(restaurantItemsMap)
            .map(([name, data]) => ({ name, quantity: data.quantity, restaurantName: "" }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 8);

          setTopProducts(sortedProducts);
          setTopRestaurantItems(sortedRestaurantItems);
          setTopRestaurants([]); // Will be populated from main orders data
        }
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch order items for a specific order
  const fetchOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) {
      return; // Already fetched
    }

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("quantity, price, item_type, product:products(name, image_url), restaurant_item:restaurant_items!fk_rest_item(name, image_url)")
        .eq("order_id", orderId);

      if (error) {
        console.error("Error fetching order items:", error);
        setOrderItems(prev => ({
          ...prev,
          [orderId]: []
        }));
      } else {
        setOrderItems(prev => ({
          ...prev,
          [orderId]: data || []
        }));
      }
    } catch (error) {
      console.error("Failed to fetch order items:", error);
      setOrderItems(prev => ({
        ...prev,
        [orderId]: []
      }));
    }
  };

  // Get filtered orders
  const filteredOrders = useMemo(() => {
    let orders = allOrders;

    if (selectedUserId) {
      orders = orders.filter((o) => o.user_id === selectedUserId);
    }

    return orders;
  }, [allOrders, selectedUserId]);

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

  // Chart data for orders
  const orderChartData = useMemo(() => {
    return Object.entries(groupedOrders)
      .map(([label, orders]) => ({
        name: label,
        orders: orders.length,
        revenue: parseFloat(orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)),
      }))
      .slice(-30);
  }, [groupedOrders]);

  // Total stats
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const deliveredOrders = filteredOrders.filter((o) => o.status === "delivered").length;

    return {
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
      deliveredOrders,
    };
  }, [filteredOrders]);

  // Get orders for a specific period
  const getOrdersForPeriod = (periodLabel: string) => {
    return groupedOrders[periodLabel] || [];
  };

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <p className="text-white/60 text-sm mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-blue-400">{stats.totalOrders}</p>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <p className="text-white/60 text-sm mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-green-400">€{stats.totalRevenue}</p>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <p className="text-white/60 text-sm mb-2">Average Order Value</p>
          <p className="text-3xl font-bold text-purple-400">€{stats.avgOrderValue}</p>
        </div>
        <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <p className="text-white/60 text-sm mb-2">Delivered Orders</p>
          <p className="text-3xl font-bold text-emerald-400">{stats.deliveredOrders}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Time Filter */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/80">Filter by Time Period</label>
          <div className="flex gap-2">
            {(["day", "week", "month", "year"] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  filterType === type
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                    : "bg-slate-800/40 border border-white/10 text-white/80 hover:border-white/20"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* User Search */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/80">Search User</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800/40 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none transition"
            />
            {filteredUsers.length > 0 && userSearch && (
              <div className="absolute top-full mt-1 w-full bg-slate-900 border border-white/10 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setUserSearch("");
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800/50 transition text-sm"
                  >
                    <span className="font-semibold text-white">
                      {user.first_name} {user.last_name}
                    </span>
                    <span className="text-white/50 text-xs block">{user.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedUserId && (
            <div className="mt-2 inline-block">
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setUserSearch("");
                }}
                className="px-3 py-1 bg-red-600/20 border border-red-600/40 text-red-400 rounded-lg text-sm hover:bg-red-600/30 transition"
              >
                ✕ Clear filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Orders Summary by Period */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">📈 Orders by {filterType.charAt(0).toUpperCase() + filterType.slice(1)}</h2>
        <div className="space-y-3">
          {orderChartData.length > 0 ? (
            orderChartData.map((row) => {
              const isExpanded = expandedPeriod === row.name;
              const periodOrders = getOrdersForPeriod(row.name);
              
              return (
                <div key={row.name}>
                  <button
                    onClick={() => setExpandedPeriod(isExpanded ? null : row.name)}
                    className="w-full p-4 bg-slate-800/60 border border-white/10 rounded-lg hover:bg-slate-800/80 transition flex justify-between items-center"
                  >
                    <div className="text-left">
                      <p className="text-white font-semibold">{row.name}</p>
                      <p className="text-white/60 text-sm">{row.orders} orders • €{row.revenue.toFixed(2)}</p>
                    </div>
                    <span className="text-xl text-white/60">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-2 bg-slate-900/50 border border-white/5 rounded-lg p-4 space-y-2">
                      {periodOrders.length > 0 ? (
                        periodOrders.map((order) => {
                          const user = users.find(u => u.id === order.user_id);
                          const isOrderExpanded = expandedOrder === order.id;
                          
                          return (
                            <div key={order.id}>
                              <button
                                onClick={() => {
                                  setSelectedOrderModal(order.id);
                                  fetchOrderItems(order.id);
                                }}
                                className="w-full bg-slate-800/40 p-3 rounded border border-white/10 hover:border-white/20 transition text-left"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-white font-semibold">
                                      {user?.first_name} {user?.last_name}
                                    </p>
                                    <p className="text-white/60 text-xs">{user?.email}</p>
                                    <p className="text-white/50 text-xs">{new Date(order.created_at).toLocaleString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-green-400 font-semibold">€{order.total.toFixed(2)}</p>
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                      order.status === "delivered"
                                        ? "bg-green-500/20 text-green-400"
                                        : order.status === "pending"
                                        ? "bg-yellow-500/20 text-yellow-400"
                                        : "bg-red-500/20 text-red-400"
                                    }`}>
                                      {order.status}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-white/60 text-sm">No orders in this period</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-white/60 py-8 text-center">No data available</p>
          )}
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          🛍️ Top Selling Products
          {topProducts.length > 0 && <span className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full">{topProducts.length}</span>}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {topProducts.length > 0 ? (
            topProducts.map((item, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-white/10 rounded-lg overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition group">
                <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                  {item.image && item.image.startsWith("http") ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <span className="text-5xl">🛒</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-white font-semibold text-xs line-clamp-1">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-emerald-400 font-bold text-sm">{item.quantity}×</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-4 text-white/60 py-8 text-center">No products sold yet</p>
          )}
        </div>
      </div>

      {/* Top Selling Restaurant Items */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          🍽️ Top Selling Restaurant Items
          {topRestaurantItems.length > 0 && <span className="text-sm bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full">{topRestaurantItems.length}</span>}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {topRestaurantItems.length > 0 ? (
            topRestaurantItems.map((item, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-white/10 rounded-lg overflow-hidden hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition">
                <div className="aspect-square bg-gradient-to-br from-orange-900/20 to-slate-900 flex items-center justify-center text-6xl">
                  🍽️
                </div>
                <div className="p-2">
                  <p className="text-white font-semibold text-xs line-clamp-1">{item.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-orange-400 font-bold text-sm">{item.quantity}×</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-4 text-white/60 py-8 text-center">No restaurant items sold yet</p>
          )}
        </div>
      </div>

      {/* User Orders Table */}
      {selectedUserId && (
        <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            📋 Order History -{" "}
            {users.find((u) => u.id === selectedUserId)?.first_name}{" "}
            {users.find((u) => u.id === selectedUserId)?.last_name}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/80">Order ID</th>
                  <th className="text-left py-3 px-4 text-white/80">Date</th>
                  <th className="text-left py-3 px-4 text-white/80">Total</th>
                  <th className="text-left py-3 px-4 text-white/80">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((order) => (
                      <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-3 px-4 text-white/80">{order.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4 text-white/80">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-white font-semibold">€{order.total.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.status === "delivered"
                                ? "bg-green-500/20 text-green-400"
                                : order.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-white/60">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Restaurants */}
      <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          ⭐ Most Popular Restaurants
          {topRestaurants.length > 0 && <span className="text-sm bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full">{topRestaurants.length}</span>}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topRestaurants.length > 0 ? (
            topRestaurants.map((restaurant, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-white/10 rounded-lg overflow-hidden hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition">
                <div className="aspect-video bg-gradient-to-br from-yellow-900/20 to-slate-900 flex items-center justify-center text-5xl">
                  🏪
                </div>
                <div className="p-4">
                  <p className="text-white font-semibold text-sm">{restaurant.name}</p>
                  <div className="mt-3">
                    <span className="text-yellow-400 font-bold text-lg">{restaurant.quantity}</span>
                    <span className="text-white/50 text-xs ml-2">items ordered</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-3 text-white/60 py-8 text-center">No restaurant data available</p>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800/80 border-b border-white/10 p-6 flex items-center justify-between">
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

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {orderItems[selectedOrderModal] && orderItems[selectedOrderModal].length > 0 ? (
                orderItems[selectedOrderModal].map((item: any, idx: number) => (
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
                        <p className="text-white font-semibold text-lg mb-2">
                          {item.product?.name || item.restaurant_item?.name || "Unknown Item"}
                        </p>
                        
                        {item.item_type === "restaurant" && (
                          <p className="text-white/60 text-sm mb-3">🍽️ Restaurant Item</p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white/80 text-sm">Quantity: </span>
                            <span className="text-white font-semibold">{item.quantity}×</span>
                          </div>
                          <div className="text-right">
                            <span className="text-white/80 text-sm">Price: </span>
                            <span className="text-green-400 font-semibold">€{(item.price || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
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
