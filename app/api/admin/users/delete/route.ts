import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const { user_id } = await req.json();

  if (!user_id)
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const { error } = await adminSupabase.auth.admin.deleteUser(user_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
