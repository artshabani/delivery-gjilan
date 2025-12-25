import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const { email, first_name, last_name, phone, address, transportation_fee } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Create the auth user
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userId = data.user.id;

    // 2. Insert profile row
    const { error: profileError } = await adminSupabase
      .from("user_profiles")
      .insert({
        id: userId,
        first_name,
        last_name,
        phone,
        address,
        transportation_fee: transportation_fee != null ? Number(transportation_fee) : null,
      });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    // 3. Generate permanent QR login token
    const token = nanoid(32);

    const { error: tokenError } = await adminSupabase
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
