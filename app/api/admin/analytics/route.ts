import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Get all status logs with order details
        const { data: logs, error: logsError } = await adminSupabase
            .from("order_status_logs")
            .select("*")
            .order("changed_at", { ascending: false });

        if (logsError) {
            console.error("Error fetching logs:", logsError);
            return NextResponse.json({ error: logsError.message }, { status: 400 });
        }

        // Get all orders for additional metrics
        const { data: orders, error: ordersError } = await adminSupabase
            .from("orders")
            .select("id, created_at, status, total")
            .order("created_at", { ascending: false });

        if (ordersError) {
            console.error("Error fetching orders:", ordersError);
            return NextResponse.json({ error: ordersError.message }, { status: 400 });
        }

        // Calculate metrics
        const metrics = calculateMetrics(logs || [], orders || []);

        return NextResponse.json({
            logs: logs || [],
            orders: orders || [],
            metrics,
        });
    } catch (err: any) {
        console.error("Analytics error:", err);
        return NextResponse.json(
            { error: err.message || "Server error" },
            { status: 500 }
        );
    }
}

function calculateMetrics(logs: any[], orders: any[]) {
    // Group logs by order_id
    const logsByOrder = logs.reduce((acc, log) => {
        if (!acc[log.order_id]) acc[log.order_id] = [];
        acc[log.order_id].push(log);
        return acc;
    }, {} as Record<string, any[]>);

    // Calculate average times between status changes
    const timings: {
        pendingToAccepted: number[];
        acceptedToDelivery: number[];
        deliveryToDelivered: number[];
        totalTime: number[];
    } = {
        pendingToAccepted: [],
        acceptedToDelivery: [],
        deliveryToDelivered: [],
        totalTime: [],
    };

    Object.entries(logsByOrder).forEach(([orderId, orderLogs]) => {
        const sortedLogs = (orderLogs as any[]).sort(
            (a: any, b: any) =>
                new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
        );

        let pendingTime: Date | null = null;
        let acceptedTime: Date | null = null;
        let deliveryTime: Date | null = null;
        let deliveredTime: Date | null = null;

        sortedLogs.forEach((log: any) => {
            const time = new Date(log.changed_at);

            if (log.new_status === "pending" || log.old_status === null) {
                pendingTime = time;
            } else if (log.new_status === "accepted") {
                acceptedTime = time;
                if (pendingTime) {
                    timings.pendingToAccepted.push(
                        (time.getTime() - pendingTime.getTime()) / 1000 / 60
                    );
                }
            } else if (log.new_status === "out_for_delivery") {
                deliveryTime = time;
                if (acceptedTime) {
                    timings.acceptedToDelivery.push(
                        (time.getTime() - acceptedTime.getTime()) / 1000 / 60
                    );
                }
            } else if (log.new_status === "delivered") {
                deliveredTime = time;
                if (deliveryTime) {
                    timings.deliveryToDelivered.push(
                        (time.getTime() - deliveryTime.getTime()) / 1000 / 60
                    );
                }
                if (pendingTime) {
                    timings.totalTime.push(
                        (time.getTime() - pendingTime.getTime()) / 1000 / 60
                    );
                }
            }
        });
    });

    const avg = (arr: number[]) =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Status distribution
    const statusCounts = orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Revenue metrics
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const deliveredOrders = orders.filter((o) => o.status === "delivered");
    const deliveredRevenue = deliveredOrders.reduce(
        (sum, o) => sum + (o.total || 0),
        0
    );

    return {
        averageTimes: {
            pendingToAccepted: avg(timings.pendingToAccepted),
            acceptedToDelivery: avg(timings.acceptedToDelivery),
            deliveryToDelivered: avg(timings.deliveryToDelivered),
            totalTime: avg(timings.totalTime),
        },
        statusDistribution: statusCounts,
        orderCounts: {
            total: orders.length,
            delivered: deliveredOrders.length,
            pending: orders.filter((o) => o.status === "pending").length,
            accepted: orders.filter((o) => o.status === "accepted").length,
            outForDelivery: orders.filter((o) => o.status === "out_for_delivery")
                .length,
            canceled: orders.filter((o) => o.status === "canceled").length,
        },
        revenue: {
            total: totalRevenue,
            delivered: deliveredRevenue,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        },
    };
}
