import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const { user_id, email, first_name, last_name, phone, address, transportation_fee } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // 1. Update email in auth
  const { error: emailError } = await adminSupabase.auth.admin.updateUserById(
    user_id,
    { email }
  );

  if (emailError) {
    return NextResponse.json(
      { error: emailError.message },
      { status: 400 }
    );
  }

  // 2. Update profile fields
  const { error: profileError } = await adminSupabase
    .from("user_profiles")
    .update({
      first_name,
      last_name,
      phone,
      address,
      transportation_fee: transportation_fee != null ? Number(transportation_fee) : null,
    })
    .eq("id", user_id);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
