"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useAdminGuard } from "@/app/hooks/useAdminGuard";

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
}

export default function AdminUsers() {
  const guard = useAdminGuard();

  // form states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [users, setUsers] = useState<UserRow[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loginLink, setLoginLink] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [search, setSearch] = useState("");

  // LOAD USERS
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch("/api/admin/users/list");
      const result = await res.json();
      if (result.users) setUsers(result.users);
    };
    fetchUsers();
  }, []);

  // CREATE USER
  const createUser = async () => {
    if (!email) return;

    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
      }),
    });

    const result = await res.json();
    if (result.error) return alert(result.error);

    const token = result.token;
    const link = `${window.location.origin}/auth?token=${token}`;

    setLoginLink(link);
    setQrCodeUrl(await QRCode.toDataURL(link));

    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setAddress("");

    const reload = await fetch("/api/admin/users/list");
    setUsers((await reload.json()).users);
  };

  // SHOW QR
  const showQrForUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/get-user-token?user_id=${userId}`);
    const result = await res.json();
    if (result.error) return alert(result.error);

    const link = `${window.location.origin}/auth?token=${result.token}`;
    setLoginLink(link);
    setQrCodeUrl(await QRCode.toDataURL(link));
  };

  // DELETE USER
  const deleteUser = async (userId: string) => {
    if (!confirm("Delete this user?")) return;
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
    const result = await res.json();
    if (result.error) return alert(result.error);

    const reload = await fetch("/api/admin/users/list");
    setUsers((await reload.json()).users);
  };

  // SAVE EDIT
  const saveEdit = async () => {
    if (!editingUser) return;

    const res = await fetch("/api/admin/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: editingUser.id,
        email: editEmail,
        first_name: editFirstName,
        last_name: editLastName,
        phone: editPhone,
        address: editAddress,
      }),
    });

    const result = await res.json();
    if (result.error) return alert(result.error);

    setEditingUser(null);

    const reload = await fetch("/api/admin/users/list");
    setUsers((await reload.json()).users);
  };

  // -------------------------------------------
  // ACCESS CONTROL
  // -------------------------------------------
  if (guard.loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Checking admin access…
      </div>
    );

  if (!guard.allowed)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-2xl font-semibold">
        ⛔ Access denied — Admin only
      </div>
    );

  // -------------------------------------------
  // RENDER ADMIN PAGE (DARK MODE)
  // -------------------------------------------
  return (
<div className="min-h-screen bg-black text-gray-200 p-5 w-full">

      {/* NAVIGATION BUTTONS */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/admin/products"
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded text-sm transition"
        >
          🛒 Products Dashboard
        </a>

        <a
          href="/admin/orders"
          className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-sm transition"
        >
          📦 Orders Dashboard
        </a>
        <a
          href="/admin/restaurants"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition"
        >
          🍽️ Restaurants Dashboard
        </a>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-white">Admin — Users</h1>

      {/* CREATE USER */}
<div className="border border-gray-700 p-6 rounded-lg bg-gray-900/80 shadow mb-8 space-y-3 w-full">
        <h2 className="text-xl font-semibold mb-3 text-white">Create User</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="p-2 bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="p-2 bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-2 bg-gray-800 border border-gray-700 rounded text-gray-200"
          />
          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="p-2 bg-gray-800 border border-gray-700 rounded text-gray-200 md:col-span-2"
          />
        </div>

        <button
          onClick={createUser}
          className="bg-green-700 hover:bg-green-600 text-white p-2 rounded w-full md:w-48"
        >
          Create User
        </button>
      </div>

      {/* QR CODE */}
      {qrCodeUrl && (
        <div className="mb-6 p-6 border border-gray-700 rounded-lg bg-gray-900/80 shadow text-center">
          <h3 className="font-semibold mb-3 text-white">Login QR Code</h3>

          <img src={qrCodeUrl} className="mx-auto w-48 h-48" />

          <p className="mt-3 text-sm break-all text-gray-300">{loginLink}</p>

          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = qrCodeUrl!;
              a.download = "login_qr.png";
              a.click();
            }}
            className="mt-3 bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded"
          >
            Download QR
          </button>
        </div>
      )}

      {/* SEARCH */}
      <div className="mb-4">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-700 rounded w-full text-gray-200"
        />
      </div>

      {/* USERS TABLE */}
<div className="bg-gray-900/70 border border-gray-700 shadow rounded-lg overflow-hidden w-full">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-800 text-gray-300 uppercase text-sm">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users
              .filter((u) => {
                const s = search.toLowerCase();
                return (
                  u.email.toLowerCase().includes(s) ||
                  (u.first_name || "").toLowerCase().includes(s) ||
                  (u.last_name || "").toLowerCase().includes(s) ||
                  (u.phone || "").toLowerCase().includes(s) ||
                  (u.address || "").toLowerCase().includes(s)
                );
              })
              .map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-t border-gray-700 ${
                    i % 2 === 0 ? "bg-gray-900" : "bg-gray-800"
                  } hover:bg-gray-700 transition`}
                >
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    {(u.first_name || "") + " " + (u.last_name || "")}
                  </td>
                  <td className="p-3">{u.phone || ""}</td>
                  <td className="p-3">{u.address || ""}</td>

                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => showQrForUser(u.id)}
                        className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm"
                      >
                        QR
                      </button>
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditEmail(u.email || "");
                          setEditFirstName(u.first_name || "");
                          setEditLastName(u.last_name || "");
                          setEditPhone(u.phone || "");
                          setEditAddress(u.address || "");
                        }}
                        className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg shadow-lg w-96 space-y-4 text-gray-200">
            <h3 className="text-lg font-semibold text-white">Edit User</h3>

            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
            <input
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
            <input
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
            <input
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />
            <input
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={saveEdit}
                className="bg-green-700 hover:bg-green-600 text-white px-3 py-2 rounded w-full"
              >
                Save
              </button>

              <button
                onClick={() => setEditingUser(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
