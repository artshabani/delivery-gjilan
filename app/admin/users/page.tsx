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
  // 🔐 ALWAYS FIRST HOOK
  const guard = useAdminGuard();

  // 🔥 ALWAYS RUN HOOKS UNCONDITIONALLY
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

      if (result.users) {
        setUsers(
          result.users.map((u: any) => ({
            id: u.id,
            email: u.email,
            first_name: u.first_name,
            last_name: u.last_name,
            phone: u.phone,
            address: u.address,
          }))
        );
      }
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

    // reload users
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
  // ONLY RETURN AFTER ALL HOOKS ARE DEFINED
  // -------------------------------------------
  if (guard.loading) {
    return (
      <div className="p-10 text-center text-lg">
        Checking admin access…
      </div>
    );
  }

  if (!guard.allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 text-2xl font-semibold">
        ⛔ Access denied — Admin only
      </div>
    );
  }

  // -------------------------------------------
  // NOW RENDER ADMIN PAGE
  // -------------------------------------------
  return (
    <div className="p-5 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin — Users</h1>

      {/* CREATE USER */}
      <div className="border p-6 rounded-lg bg-white shadow mb-8 space-y-3">
        <h2 className="text-xl font-semibold mb-3">Create User</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2 border rounded" />
          <input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="p-2 border rounded" />
          <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="p-2 border rounded md:col-span-2" />
        </div>

        <button onClick={createUser} className="bg-green-600 text-white p-2 rounded w-full md:w-48">
          Create User
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded w-full"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700 uppercase text-sm">
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
                  className={`border-t hover:bg-gray-50 transition ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    {(u.first_name || "") + " " + (u.last_name || "")}
                  </td>
                  <td className="p-3">{u.phone || ""}</td>
                  <td className="p-3">{u.address || ""}</td>

                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => showQrForUser(u.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">QR</button>
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditEmail(u.email || "");
                          setEditFirstName(u.first_name || "");
                          setEditLastName(u.last_name || "");
                          setEditPhone(u.phone || "");
                          setEditAddress(u.address || "");
                        }}
                        className="px-2 py-1 bg-yellow-500 text-white rounded text-sm"
                      >
                        Edit
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 space-y-4">
            <h3 className="text-lg font-semibold">Edit User</h3>
            <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full p-2 border rounded" />
            <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full p-2 border rounded" />
            <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full p-2 border rounded" />
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full p-2 border rounded" />
            <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full p-2 border rounded" />

            <div className="flex gap-2 pt-2">
              <button onClick={saveEdit} className="bg-green-600 text-white px-3 py-2 rounded w-full">Save</button>
              <button onClick={() => setEditingUser(null)} className="bg-gray-500 text-white px-3 py-2 rounded w-full">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE POPUP */}
      {qrCodeUrl && (
        <div className="mt-8 p-6 border rounded-lg bg-white shadow text-center">
          <h3 className="font-semibold mb-3">Login QR Code</h3>
          <img src={qrCodeUrl} className="mx-auto w-48 h-48" />
          <p className="mt-3 text-sm break-all">{loginLink}</p>

          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = qrCodeUrl!;
              a.download = "login_qr.png";
              a.click();
            }}
            className="mt-3 bg-gray-800 text-white px-3 py-1 rounded"
          >
            Download QR
          </button>
        </div>
      )}
    </div>
  );
}
