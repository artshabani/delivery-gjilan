"use client";

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <Link
          href="/admin/products"
          className="p-4 border rounded-lg bg-gray-900 hover:bg-gray-800 transition text-white"
        >
          🛒 Products
        </Link>

        <Link
          href="/admin/restaurants"
          className="p-4 border rounded-lg bg-gray-900 hover:bg-gray-800 transition text-white"
        >
          🍽️ Restaurants
        </Link>

        <Link
          href="/admin/restaurants/categories"
          className="p-4 border rounded-lg bg-gray-900 hover:bg-gray-800 transition text-white"
        >
          🧩 Restaurant Categories
        </Link>

        <Link
          href="/admin/restaurants/items"
          className="p-4 border rounded-lg bg-gray-900 hover:bg-gray-800 transition text-white"
        >
          🍔 Restaurant Menu Items
        </Link>

      </div>
    </div>
  );
}
