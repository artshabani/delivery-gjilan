"use client";

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6">

      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold text-center text-white mb-8">
          Admin Panel
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <Link
            href="/admin/products"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-purple-400 transition 
                       text-white text-lg"
          >
            🛒 Products
          </Link>

          <Link
            href="/admin/restaurants"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-blue-400 transition 
                       text-white text-lg"
          >
            🍽️ Restaurants
          </Link>

           <Link
            href="/admin/orders"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-blue-400 transition 
                       text-white text-lg"
          >
            Orders
          </Link>
          <Link
            href="/admin/users"
            className="p-4 border border-gray-700 rounded-lg bg-gray-900/80
                       hover:bg-gray-800 hover:border-blue-400 transition 
                       text-white text-lg"
          >
            Users
          </Link>


        </div>
      </div>

    </div>
  );
}
