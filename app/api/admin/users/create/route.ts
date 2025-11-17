import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

// Backend client (service role)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(req: Request) {
  try {
    const { email, first_name, last_name, phone, address } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Create the auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user.id;

    // 2. Insert profile row
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        first_name,
        last_name,
        phone,
        address,
      });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // 3. Generate permanent QR login token
    const token = nanoid(32);

    const { error: tokenError } = await supabase
      .from("login_tokens")
      .insert({ user_id: userId, token });

    if (tokenError) {
      return NextResponse.json(
        { error: tokenError.message },
        { status: 400 }
      );
    }

    // 4. Return success
    return NextResponse.json({
      user: data.user,
      token,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
