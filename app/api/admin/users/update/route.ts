import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(req: Request) {
  const { user_id, email, first_name, last_name, phone, address } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // 1. Update email in auth
  const { error: emailError } = await supabase.auth.admin.updateUserById(
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
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      first_name,
      last_name,
      phone,
      address,
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
