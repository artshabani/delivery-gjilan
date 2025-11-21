"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAdminGuard() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const userId = localStorage.getItem("dg_user_id");
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (data?.role) {
        setRole(data.role);
        if (data.role === "admin") setAllowed(true);
      }

      setLoading(false);
    }

    check();
  }, []);

  return { loading, allowed, role };
}
