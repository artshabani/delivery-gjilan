import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Returns the effective transportation fee.
 * If `userId` query param is provided and the user has a specific fee
 * (e.g. user_profiles.transportation_fee), it is returned.
 * Otherwise, falls back to the global site_status.transportation_fee.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Try user-specific fee first, if userId is provided
    if (userId) {
      const { data: userData, error: userError } = await adminSupabase
        .from("user_profiles")
        .select("transportation_fee")
        .eq("id", userId)
        .single();

      // If column exists and a value is set, prefer it
      if (!userError && userData && userData.transportation_fee != null) {
        return NextResponse.json({ transportation_fee: Number(userData.transportation_fee) });
      }
      // If selection fails (e.g., column missing) or value not set, continue to global fallback
    }

    // Global fallback from site_status
    const { data, error } = await adminSupabase
      .from("site_status")
      .select("transportation_fee")
      .eq("id", 1)
      .single();

    if (error) {
      // Fail open: default to 0 if table not ready yet
      return NextResponse.json({ transportation_fee: 0 });
    }

    return NextResponse.json({ transportation_fee: Number(data?.transportation_fee || 0) });
  } catch (e) {
    console.error("[pricing/transportation-fee] error:", e);
    return NextResponse.json({ transportation_fee: 0 });
  }
}
