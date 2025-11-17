import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    console.log("🟦 Received token:", token);

    const { data, error } = await supabase
      .from("login_tokens")
      .select("user_id")
      .eq("token", token)
      .single();

    console.log("🟩 Query result:", data, "🟥 Error:", error);

    if (!data) {
      return NextResponse.json(
        { error: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    const userId = data.user_id as string;

    // You can keep this JWT for later if we want real Supabase Auth
    const jwtToken = jwt.sign(
      { sub: userId, role: "authenticated" },
      process.env.SUPABASE_JWT_SECRET!,
      { expiresIn: "30d" }
    );

    // ✅ Return BOTH jwt and userId
    return NextResponse.json({ jwt: jwtToken, userId });
  } catch (err) {
    console.log("🔥 SERVER ERROR", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", detail: String(err) },
      { status: 500 }
    );
  }
}
