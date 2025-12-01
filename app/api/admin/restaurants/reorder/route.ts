import { NextRequest, NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { order } = body; // array of { id, sort_order }

        if (!order || !Array.isArray(order)) {
            return NextResponse.json(
                { error: "Invalid order data" },
                { status: 400 }
            );
        }

        // Update each restaurant's sort_order
        const updatePromises = order.map(({ id, sort_order }) =>
            adminSupabase
                .from("restaurants")
                .update({ sort_order })
                .eq("id", id)
        );

        await Promise.all(updatePromises);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error reordering restaurants:", error);
        return NextResponse.json(
            { error: "Failed to reorder restaurants" },
            { status: 500 }
        );
    }
}
