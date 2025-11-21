import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public endpoint to read site availability
export async function GET() {
  const { data, error } = await adminSupabase
    .from("site_status")
    .select("is_closed")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[site_status] read error:", error);
    // Fail open so the site keeps working if the table doesn't exist yet
    return NextResponse.json({ closed: false });
  }

  return NextResponse.json({ closed: Boolean(data?.is_closed) });
}
