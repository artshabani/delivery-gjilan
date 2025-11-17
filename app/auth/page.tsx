"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// (You can keep this import for later, but we won't use auth right now)
import { supabase } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token");

  useEffect(() => {
    const login = async () => {
      if (!token) return;

      const res = await fetch("/api/jwt-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      console.log("JWT LOGIN RESPONSE:", data);

      if (!res.ok || !data.userId) {
        alert("Invalid or expired login link");
        return;
      }

      // ✅ Store userId in localStorage for later
      if (typeof window !== "undefined") {
        localStorage.setItem("dg_user_id", data.userId);
      }

      // We *could* also set Supabase auth here later, but skip for now
      // await supabase.auth.setSession({
      //   access_token: data.jwt,
      //   refresh_token: data.jwt,
      // });

      router.push("/products");
    };

    login();
  }, [token, router]);

  return (
    <p className="p-4 text-center text-white">
      Logging in...
    </p>
  );
}
