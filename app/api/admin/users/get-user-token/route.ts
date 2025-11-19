import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json(
      { error: "user_id is required" },
      { status: 400 }
    );
  }

  const { data, error } = await adminSupabase
    .from("login_tokens")
    .select("token")
    .eq("user_id", user_id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Token not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ token: data.token });
}
