import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const body = await req.json();
    const { name, emoji, old_name } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // 1. Get current section to verify restaurant_id
    const { data: section, error: fetchError } = await adminSupabase
        .from("restaurant_sections")
        .select("restaurant_id")
        .eq("id", id)
        .single();

    if (fetchError || !section) {
        return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // 2. Update section
    const { error: updateError } = await adminSupabase
        .from("restaurant_sections")
        .update({ name, emoji })
        .eq("id", id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

    // 3. If name changed, update all items that had the old section name
    if (old_name && name && old_name !== name) {
        await adminSupabase
            .from("restaurant_items")
            .update({ section: name })
            .eq("restaurant_id", section.restaurant_id)
            .eq("section", old_name);
    }

    return NextResponse.json({ success: true });
}
