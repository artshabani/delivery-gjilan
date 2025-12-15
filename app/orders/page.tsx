"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Clock, Package, CheckCircle, XCircle, Truck } from "lucide-react";
import Link from "next/link";

interface OrderItem {
    id: number;
    quantity: number;
    price: number;
    notes?: string;
    product?: {
        name: string;
        image_url: string | null;
    };
    restaurant_item?: {
        name: string;
        image_url: string | null;
    };
}

interface Order {
    id: string;
    total: number;
    status: string;
    created_at: string;
    eta_minutes?: number;
    out_for_delivery_at?: string;
    order_items: OrderItem[];
}

export default function OrderHistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const userId = localStorage.getItem("dg_user_id");
        if (!userId) {
            router.push("/login");
            return;
        }

        async function fetchOrders() {
            try {
                const res = await fetch(`/api/orders/history?user_id=${userId}`);
                const data = await res.json();
                if (data.orders) {
                    setOrders(data.orders);
                }
            } catch (error) {
                console.error("Failed to fetch orders", error);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [router]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "text-yellow-500 bg-yellow-500/15";
            case "accepted":
                return "text-blue-400 bg-blue-400/15";
            case "out_for_delivery":
                return "text-cyan-400 bg-cyan-400/15";
            case "delivered":
                return "text-green-400 bg-green-400/15";
            case "canceled":
                return "text-red-400 bg-red-400/15";
            default:
                return "text-white/70 bg-white/10";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "pending":
                return <Clock size={16} />;
            case "accepted":
                return <Package size={16} />;
            case "out_for_delivery":
                return <Truck size={16} />;
            case "delivered":
                return <CheckCircle size={16} />;
            case "canceled":
                return <XCircle size={16} />;
            default:
                return <Clock size={16} />;
        }
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, " ").toUpperCase();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
                {/* Header Skeleton */}
                <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 p-4 sm:p-6">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800/50 rounded-full animate-pulse"></div>
                        <div className="h-8 w-40 bg-slate-800/50 rounded animate-pulse"></div>
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 animate-pulse">
                            <div className="flex justify-between mb-4">
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-slate-800/50 rounded"></div>
                                    <div className="h-6 w-24 bg-slate-800/50 rounded"></div>
                                </div>
                                <div className="h-8 w-20 bg-slate-800/50 rounded"></div>
                            </div>
                            <div className="space-y-3">
                                {[...Array(2)].map((_, j) => (
                                    <div key={j} className="flex gap-3">
                                        <div className="w-14 h-14 bg-slate-800/50 rounded-lg"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-3/4 bg-slate-800/50 rounded"></div>
                                            <div className="h-3 w-1/2 bg-slate-800/50 rounded"></div>
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 p-4 sm:p-6 shadow-lg shadow-black/20">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-3">
                        <Link 
                            href="/" 
                            className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/50 transition-all hover:scale-105"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                                Order History
                            </h1>
                            <p className="text-white/60 text-sm mt-0.5">Track your past orders</p>
                        </div>
                    </div>

                    {orders.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-white/50">
                            <Package size={16} className="text-purple-400" />
                            <span>{orders.length} order{orders.length !== 1 ? 's' : ''} found</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
                {orders.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
                            <Package size={40} className="text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white/90 mb-2">No Orders Yet</h2>
                        <p className="text-white/50 mb-6 max-w-sm mx-auto">
                            Start exploring our menu and place your first order!
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
                        >
                            <span>Start Shopping</span>
                            <ArrowLeft size={18} className="rotate-180" />
                        </Link>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            className="group bg-gradient-to-br from-slate-900/90 to-slate-900/50 backdrop-blur-sm border border-slate-800/50 hover:border-purple-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
                        >
                            {/* Order Header */}
                            <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-white/60">
                                        <Clock size={14} className="text-purple-400" />
                                        <span>
                                            {new Date(order.created_at).toLocaleDateString('en-GB', { 
                                                day: 'numeric', 
                                                month: 'short', 
                                                year: 'numeric' 
                                            })}
                                        </span>
                                        <span className="text-white/40">•</span>
                                        <span>
                                            {new Date(order.created_at).toLocaleTimeString([], { 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </span>
                                    </div>
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        {formatStatus(order.status)}
                                    </div>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                                    <div className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                                        €{order.total.toFixed(2)}
                                    </div>
                                    <div className="px-2.5 py-1 bg-slate-800/50 rounded-full text-xs text-white/60 border border-slate-700/50">
                                        {order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-5 space-y-3">
                                {order.order_items.map((item) => {
                                    const product = item.product || item.restaurant_item;
                                    return (
                                        <div 
                                            key={item.id} 
                                            className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 border border-transparent hover:border-slate-700/50 transition-all"
                                        >
                                            <div className="w-14 h-14 bg-slate-800/50 rounded-xl relative overflow-hidden flex-shrink-0 border border-slate-700/30">
                                                {product?.image_url && product.image_url.startsWith('http') ? (
                                                    <Image
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package size={20} className="text-white/20" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <p className="font-semibold text-white text-sm sm:text-base truncate">
                                                        {product?.name || "Unknown Item"}
                                                    </p>
                                                    <p className="text-sm sm:text-base font-bold text-emerald-400 whitespace-nowrap">
                                                        €{(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-white/70 font-medium">
                                                        {item.quantity}x
                                                    </span>
                                                    <span className="text-xs text-white/50">
                                                        €{item.price.toFixed(2)} each
                                                    </span>
                                                </div>
                                                {item.notes && (
                                                    <p className="text-xs text-white/60 mt-1 italic">
                                                        Note: {item.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Order Footer with ID */}
                            <div className="px-5 pb-4 pt-2 border-t border-white/5">
                                <p className="text-xs text-white/40 font-mono">
                                    Order ID: {order.id}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
