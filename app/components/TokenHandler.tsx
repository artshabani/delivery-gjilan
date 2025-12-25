"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function TokenHandler() {
  const search = useSearchParams();

  // Just consume the useSearchParams hook for Suspense boundary;
  // token stays on the home URL without redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const tokenParam = search?.get("token");
    // Token remains in the URL; no redirect needed
  }, [search]);

  return null;
}
