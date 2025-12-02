import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
    try {
        // 1. Get all restaurants
        const { data: restaurants, error: restaurantsError } = await adminSupabase
            .from("restaurants")
            .select("id");

        if (restaurantsError) {
            return NextResponse.json({ error: restaurantsError.message }, { status: 400 });
        }

        let totalMigrated = 0;
        const results: { restaurant_id: number; migrated: number }[] = [];

        // 2. For each restaurant, find orphaned sections and migrate them
        for (const restaurant of restaurants || []) {
            // Get all items for this restaurant
            const { data: items } = await adminSupabase
                .from("restaurant_items")
                .select("section")
                .eq("restaurant_id", restaurant.id)
                .not("section", "is", null);

            // Get unique section names from items
            const uniqueSectionNames = Array.from(
                new Set((items || []).map(item => item.section).filter(Boolean))
            );

            // Get existing sections in database
            const { data: existingSections } = await adminSupabase
                .from("restaurant_sections")
                .select("name")
                .eq("restaurant_id", restaurant.id);

            const existingNames = new Set((existingSections || []).map(s => s.name));

            // Find orphaned sections (in items but not in database)
            const orphanedNames = uniqueSectionNames.filter(name => !existingNames.has(name));

            if (orphanedNames.length > 0) {
                // Get max sort_order for this restaurant
                const { data: maxData } = await adminSupabase
                    .from("restaurant_sections")
                    .select("sort_order")
                    .eq("restaurant_id", restaurant.id)
                    .order("sort_order", { ascending: false })
                    .limit(1)
                    .single();

                let nextOrder = (maxData?.sort_order || 0) + 1;

                // Create sections for orphaned names
                const sectionsToCreate = orphanedNames.map(name => ({
                    restaurant_id: restaurant.id,
                    name: name,
                    emoji: "🍽️",
                    sort_order: nextOrder++
                }));

                await adminSupabase
                    .from("restaurant_sections")
                    .insert(sectionsToCreate);

                totalMigrated += orphanedNames.length;
                results.push({
                    restaurant_id: restaurant.id,
                    migrated: orphanedNames.length
                });
            }
        }

        return NextResponse.json({
            success: true,
            totalMigrated,
            results
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
