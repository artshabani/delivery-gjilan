"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthClient() {
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

      if (!res.ok || !data.userId) {
        alert("Invalid or expired login link");
        return;
      }

localStorage.setItem("dg_user_id", data.userId);

// 🔥 notify all listeners immediately (VERY IMPORTANT)
window.dispatchEvent(new Event("dg_user_id-set"));

      // Correct admin check
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.userId)
        .single();

      if (profile?.role === "admin") {
        router.push("/admin/orders");
      } else {
        router.push("/");
      }
    };

    login();
  }, [token, router]);

  return (
    <p className="p-4 text-center text-white">
      Logging in...
    </p>
  );
}
