"use client";

import Link from "next/link";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";

interface Props {
  label: string;
  href: string;
  className?: string;
}

export function AdminOnlyButton({ label, href, className }: Props) {
  const { loading, allowed } = useAdminGuard();

  if (loading) return null;
  if (!allowed) return null;

  return (
    <Link
      href={href}
      className={
        className ??
        "px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500"
      }
    >
      {label}
    </Link>
  );
}
