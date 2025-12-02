import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    // 1. Get section details
    const { data: section } = await adminSupabase
        .from("restaurant_sections")
        .select("name, restaurant_id")
        .eq("id", id)
        .single();

    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

    // 2. Delete section
    const { error } = await adminSupabase
        .from("restaurant_sections")
        .delete()
        .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // 3. Unassign items
    await adminSupabase
        .from("restaurant_items")
        .update({ section: null })
        .eq("restaurant_id", section.restaurant_id)
        .eq("section", section.name);

    return NextResponse.json({ success: true });
}
