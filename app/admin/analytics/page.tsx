"use client";

import { useEffect, useState } from "react";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";
import {
    Clock,
    TrendingUp,
    Package,
    DollarSign,
    Activity,
    CheckCircle,
    XCircle,
    Truck,
    AlertCircle,
} from "lucide-react";

interface Metrics {
    averageTimes: {
        pendingToAccepted: number;
        acceptedToDelivery: number;
        deliveryToDelivered: number;
        totalTime: number;
    };
    statusDistribution: Record<string, number>;
    orderCounts: {
        total: number;
        delivered: number;
        pending: number;
        accepted: number;
        outForDelivery: number;
        canceled: number;
    };
    revenue: {
        total: number;
        delivered: number;
        averageOrderValue: number;
    };
}

export default function AnalyticsDashboard() {
    const guard = useAdminGuard();
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch("/api/admin/analytics");
                const data = await res.json();
                if (data.metrics) {
                    setMetrics(data.metrics);
                }
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchAnalytics();
    }, []);

    if (guard.loading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                Loading analytics...
            </div>
        );
    }

    if (!guard.allowed) {
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500 text-2xl font-semibold bg-black">
                ⛔ Access denied — Admin only
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                No data available
            </div>
        );
    }

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-6 sm:p-8">
            {/* NAVIGATION */}
            <div className="flex flex-wrap gap-2 mb-6">
                <a
                    href="/admin/orders"
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-sm transition"
                >
                    📦 Orders Dashboard
                </a>
                <a
                    href="/admin/products"
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm transition"
                >
                    🛒 Products Dashboard
                </a>
                <a
                    href="/admin/users"
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm transition"
                >
                    👥 Users Dashboard
                </a>
                <a
                    href="/admin/restaurants"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition"
                >
                    🍽️ Restaurants Dashboard
                </a>
            </div>

            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">📊 Analytics Dashboard</h1>
                <p className="text-gray-400">Performance metrics and insights</p>
            </div>

            {/* REVENUE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <DollarSign className="text-green-400" size={28} />
                        <span className="text-xs text-green-300 font-semibold uppercase">Revenue</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        €{metrics.revenue.total.toFixed(2)}
                    </div>
                    <div className="text-sm text-green-200/70">Total revenue</div>
                </div>

                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <CheckCircle className="text-blue-400" size={28} />
                        <span className="text-xs text-blue-300 font-semibold uppercase">Delivered</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        €{metrics.revenue.delivered.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-200/70">From {metrics.orderCounts.delivered} orders</div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="text-purple-400" size={28} />
                        <span className="text-xs text-purple-300 font-semibold uppercase">Avg Order</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                        €{metrics.revenue.averageOrderValue.toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-200/70">Average order value</div>
                </div>
            </div>

            {/* ORDER STATUS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-slate-400" size={20} />
                        <span className="text-xs text-slate-400 uppercase font-semibold">Total</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.orderCounts.total}</div>
                </div>

                <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="text-amber-400" size={20} />
                        <span className="text-xs text-amber-400 uppercase font-semibold">Pending</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.orderCounts.pending}</div>
                </div>

                <div className="bg-sky-900/30 border border-sky-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="text-sky-400" size={20} />
                        <span className="text-xs text-sky-400 uppercase font-semibold">Accepted</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.orderCounts.accepted}</div>
                </div>

                <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="text-purple-400" size={20} />
                        <span className="text-xs text-purple-400 uppercase font-semibold">Delivery</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.orderCounts.outForDelivery}</div>
                </div>

                <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <XCircle className="text-red-400" size={20} />
                        <span className="text-xs text-red-400 uppercase font-semibold">Canceled</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{metrics.orderCounts.canceled}</div>
                </div>
            </div>

            {/* AVERAGE TIMES */}
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="text-blue-400" size={24} />
                    Average Processing Times
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="text-sm text-slate-400 mb-2">Pending → Accepted</div>
                        <div className="text-2xl font-bold text-blue-400">
                            {formatTime(metrics.averageTimes.pendingToAccepted)}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="text-sm text-slate-400 mb-2">Accepted → Out for Delivery</div>
                        <div className="text-2xl font-bold text-purple-400">
                            {formatTime(metrics.averageTimes.acceptedToDelivery)}
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="text-sm text-slate-400 mb-2">Out for Delivery → Delivered</div>
                        <div className="text-2xl font-bold text-green-400">
                            {formatTime(metrics.averageTimes.deliveryToDelivered)}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 rounded-lg p-4 border border-amber-700/50">
                        <div className="text-sm text-amber-300 mb-2 font-semibold">Total Time</div>
                        <div className="text-2xl font-bold text-amber-400">
                            {formatTime(metrics.averageTimes.totalTime)}
                        </div>
                    </div>
                </div>
            </div>

            {/* STATUS DISTRIBUTION */}
            <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Status Distribution</h2>
                <div className="space-y-3">
                    {Object.entries(metrics.statusDistribution).map(([status, count]) => {
                        const total = metrics.orderCounts.total;
                        const percentage = total > 0 ? (count / total) * 100 : 0;

                        const colors: Record<string, string> = {
                            pending: "bg-amber-500",
                            accepted: "bg-sky-500",
                            out_for_delivery: "bg-purple-500",
                            delivered: "bg-green-500",
                            canceled: "bg-red-500",
                        };

                        return (
                            <div key={status}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-white capitalize">{status.replace(/_/g, " ")}</span>
                                    <span className="text-slate-400">
                                        {count} ({percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full ${colors[status] || "bg-slate-600"} transition-all`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
