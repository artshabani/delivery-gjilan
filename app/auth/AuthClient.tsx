"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

      router.push("/");
    };

    login();
  }, [token, router]);

  return (
    <p className="p-4 text-center text-white">
      Logging in...
    </p>
  );
}
