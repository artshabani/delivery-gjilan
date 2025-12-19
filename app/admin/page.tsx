"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalProducts: number;
  totalRestaurants: number;
}

export default function AdminHomePage() {
  const guard = useAdminGuard();
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transportationFee, setTransportationFee] = useState<string>("0");
  const [savingFee, setSavingFee] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    totalProducts: 0,
    totalRestaurants: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch("/api/admin/site/status");
      if (!res.ok) return;
      const data = await res.json();
      setClosed(Boolean(data.closed));
      setTransportationFee(String(data.transportation_fee || 0));
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch basic stats from various endpoints
        const [usersRes, ordersRes, productsRes, restaurantsRes] = await Promise.all([
          fetch("/api/admin/users/list"),
          fetch("/api/admin/analytics"),
          fetch("/api/admin/products/list"),
          fetch("/api/admin/restaurants/list"),
        ]);

        const [users, analytics, products, restaurants] = await Promise.all([
          usersRes.json(),
          ordersRes.json(),
          productsRes.json(),
          restaurantsRes.json(),
        ]);

        setStats({
          totalUsers: users.users?.length || 0,
          totalOrders: analytics.totalOrders || 0,
          totalRevenue: analytics.totalRevenue || 0,
          activeOrders: analytics.activeOrders || 0,
          totalProducts: products.products?.length || 0,
          totalRestaurants: restaurants.restaurants?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const toggleClosed = async () => {
    setBusy(true);
    await fetch("/api/admin/site/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: !closed }),
    });
    setClosed((s) => !s);
    setBusy(false);
  };

  const saveTransportationFee = async () => {
    setSavingFee(true);
    const res = await fetch("/api/admin/site/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transportation_fee: Number(transportationFee) }),
    });
    setSavingFee(false);
    if (res.ok) {
      alert("Transportation fee updated!");
    }
  };

  if (!guard) return null;

  const quickActions = [
    {
      title: "Users",
      description: "Manage customer accounts",
      icon: "👥",
      href: "/admin/users",
      color: "from-blue-600 to-blue-700",
      hoverColor: "hover:shadow-blue-500/50",
      count: stats.totalUsers,
    },
    {
      title: "Orders",
      description: "View and manage orders",
      icon: "📦",
      href: "/admin/orders",
      color: "from-green-600 to-green-700",
      hoverColor: "hover:shadow-green-500/50",
      count: stats.totalOrders,
    },
    {
      title: "Products",
      description: "Manage store inventory",
      icon: "🏷️",
      href: "/admin/products",
      color: "from-purple-600 to-purple-700",
      hoverColor: "hover:shadow-purple-500/50",
      count: stats.totalProducts,
    },
    {
      title: "Restaurants",
      description: "Manage restaurant partners",
      icon: "🍽️",
      href: "/admin/restaurants",
      color: "from-indigo-600 to-indigo-700",
      hoverColor: "hover:shadow-indigo-500/50",
      count: stats.totalRestaurants,
    },
    {
      title: "Categories",
      description: "Organize products & menus",
      icon: "📁",
      href: "/admin/categories",
      color: "from-yellow-600 to-orange-600",
      hoverColor: "hover:shadow-yellow-500/50",
      count: null,
    },
    {
      title: "Analytics",
      description: "View performance metrics",
      icon: "📊",
      href: "/admin/analytics",
      color: "from-cyan-600 to-teal-600",
      hoverColor: "hover:shadow-cyan-500/50",
      count: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-gray-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🏪 Admin Dashboard
          </h1>
          <p className="text-white/60">Manage your delivery service from here</p>
        </div>

        {/* Store Status & Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Store Status Card */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🏪 Store Status
            </h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm">Current Status</p>
                <p className={`text-lg font-bold ${
                  closed ? "text-red-400" : "text-green-400"
                }`}>
                  {closed ? "🔴 CLOSED" : "🟢 OPEN"}
                </p>
              </div>
              <button
                onClick={toggleClosed}
                disabled={busy}
                className={`px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:scale-105 ${
                  closed
                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-500/50"
                    : "bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-500/50"
                } disabled:opacity-50 disabled:hover:scale-100`}
              >
                {busy ? "Saving..." : closed ? "Open Store" : "Close Store"}
              </button>
            </div>
          </div>

          {/* Transportation Fee Card */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              🚚 Service Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Transportation / Service Fee (€)
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transportationFee}
                    onChange={(e) => setTransportationFee(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-white/10 text-white rounded-lg focus:outline-none focus:border-blue-500/50 transition"
                    placeholder="0.00"
                  />
                  <button
                    onClick={saveTransportationFee}
                    disabled={savingFee}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {savingFee ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-white/50 mt-2">
                  This fee will be added to every order. Set to 0 to disable.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats removed per request */}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">🚀 Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group bg-slate-800/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 hover:scale-105 ${action.hoverColor}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  {action.count !== null && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1">
                      <span className="text-white font-bold text-sm">{action.count}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-white/90 transition">
                  {action.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed group-hover:text-white/70 transition">
                  {action.description}
                </p>
                <div className="mt-4 flex items-center text-white/40 group-hover:text-white/60 transition">
                  <span className="text-xs font-semibold">MANAGE</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}