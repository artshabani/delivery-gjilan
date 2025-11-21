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
                return "text-amber-400 border-amber-400/30 bg-amber-400/10";
            case "accepted":
                return "text-blue-400 border-blue-400/30 bg-blue-400/10";
            case "out_for_delivery":
                return "text-purple-400 border-purple-400/30 bg-purple-400/10";
            case "delivered":
                return "text-green-400 border-green-400/30 bg-green-400/10";
            case "canceled":
                return "text-red-400 border-red-400/30 bg-red-400/10";
            default:
                return "text-gray-400 border-gray-400/30 bg-gray-400/10";
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
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-pulse text-purple-400">Loading your orders...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Link href="/" className="p-2 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-xl font-bold">Your Orders</h1>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-4">
                {orders.length === 0 ? (
                    <div className="text-center py-20 text-white/50">
                        <Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No orders yet.</p>
                        <Link
                            href="/"
                            className="inline-block mt-4 px-6 py-2 bg-purple-600 rounded-full font-semibold hover:bg-purple-500 transition"
                        >
                            Start Shopping
                        </Link>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden"
                        >
                            {/* Order Header */}
                            <div className="p-4 border-b border-white/5 flex justify-between items-start">
                                <div>
                                    <div className="text-sm text-white/50 mb-1">
                                        {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        {formatStatus(order.status)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold">€{order.total.toFixed(2)}</div>
                                    <div className="text-xs text-white/50">{order.order_items.length} items</div>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-4 space-y-3">
                                {order.order_items.map((item) => {
                                    const product = item.product || item.restaurant_item;
                                    return (
                                        <div key={item.id} className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-zinc-800 rounded-lg relative overflow-hidden flex-shrink-0">
                                                {product?.image_url ? (
                                                    <Image
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-white/30">
                                                        No img
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between">
                                                    <p className="font-medium text-sm truncate pr-2">
                                                        {product?.name || "Unknown Item"}
                                                    </p>
                                                    <p className="text-sm text-white/70">
                                                        €{(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-white/50">
                                                    {item.quantity} × €{item.price.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
