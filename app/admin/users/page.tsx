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
  const [confirmSave, setConfirmSave] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

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
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
    const result = await res.json();
    if (result.error) return alert(result.error);

    const reload = await fetch("/api/admin/users/list");
    setUsers((await reload.json()).users);
    setDeleteUserId(null);
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

  // HISTORY MODAL STATE
  const [historyUser, setHistoryUser] = useState<UserRow | null>(null);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // LOAD HISTORY
  const loadHistory = async (user: UserRow) => {
    setHistoryUser(user);
    setHistoryLoading(true);
    setHistoryOrders([]);

    try {
      const res = await fetch(`/api/admin/users/history?user_id=${user.id}`);
      const data = await res.json();
      if (data.orders) setHistoryOrders(data.orders);
    } catch (e) {
      console.error(e);
      alert("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
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
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 w-full">
      {/* NAVIGATION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <a
          href="/admin/users"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-105"
        >
          <span className="text-xl">👥</span>
          <span>Users</span>
        </a>
        <a
          href="/admin/orders"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105"
        >
          <span className="text-xl">📦</span>
          <span>Orders</span>
        </a>
        <a
          href="/admin/products"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-purple-500/50 hover:scale-105"
        >
          <span className="text-xl">🏷️</span>
          <span>Products</span>
        </a>
        <a
          href="/admin/restaurants"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-indigo-500/50 hover:scale-105"
        >
          <span className="text-xl">🍽️</span>
          <span>Restaurants</span>
        </a>
        <a
          href="/admin/analytics"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:shadow-cyan-500/50 hover:scale-105"
        >
          <span className="text-xl">📊</span>
          <span>Analytics</span>
        </a>
      </div>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">👥 Users</h1>
        <p className="text-white/60 text-sm mt-1">Manage customer accounts</p>
      </div>

      {/* SEARCH */}
      <div className="mb-4">
        <input
          placeholder="🔍 Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50 transition"
        />
      </div>

      {/* CREATE USER BUTTON */}
      <button
        onClick={() => setEditingUser({} as UserRow)}
        className="w-full mb-6 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
      >
        <span>+</span> Create New User
      </button>

      {/* QR CODE MODAL */}
      {qrCodeUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl w-full max-w-md text-center">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Login QR Code</h3>
              <button
                onClick={() => setQrCodeUrl(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition"
              >
                ✕
              </button>
            </div>
            
            <img src={qrCodeUrl} className="mx-auto w-64 h-64 rounded-lg mb-4" />
            
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm break-all text-white/70">{loginLink}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (loginLink) {
                    navigator.clipboard.writeText(loginLink);
                    alert("Link copied to clipboard!");
                    setQrCodeUrl(null);
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Copy Link
              </button>
              <button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qrCodeUrl!;
                  a.download = "login_qr.png";
                  a.click();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Download QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USERS LIST - MOBILE FRIENDLY CARDS */}
      <div className="space-y-3">
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
          .map((u) => (
            <div
              key={u.id}
              className="bg-slate-800/40 border border-white/10 rounded-lg p-4 hover:bg-slate-800/60 transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">
                    {u.first_name || "Unknown"} {u.last_name || ""}
                  </div>
                  <div className="text-sm text-white/60">{u.email}</div>
                  {u.phone && (
                    <div className="text-sm text-white/50 mt-1">📱 {u.phone}</div>
                  )}
                  {u.address && (
                    <div className="text-sm text-white/50 mt-1">📍 {u.address}</div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => showQrForUser(u.id)}
                  className="flex-1 min-w-[80px] px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  QR
                </button>
                <button
                  onClick={() => loadHistory(u)}
                  className="flex-1 min-w-[80px] px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  History
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
                  className="px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteUserId(u.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

        {users.filter((u) => {
          const s = search.toLowerCase();
          return (
            u.email.toLowerCase().includes(s) ||
            (u.first_name || "").toLowerCase().includes(s) ||
            (u.last_name || "").toLowerCase().includes(s) ||
            (u.phone || "").toLowerCase().includes(s) ||
            (u.address || "").toLowerCase().includes(s)
          );
        }).length === 0 && (
          <div className="text-center py-12 text-white/60">
            <p className="text-lg">No users found</p>
          </div>
        )}
      </div>

      {/* EDIT/CREATE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-blue-500/30 p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingUser.id ? "Edit User" : "Create User"}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Email</label>
              <input
                placeholder="Email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">First Name</label>
              <input
                placeholder="First Name"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Last Name</label>
              <input
                placeholder="Last Name"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Phone</label>
              <input
                placeholder="Phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Address</label>
              <input
                placeholder="Address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder:text-white/40"
              />
            </div>

            <div className="flex gap-2">
              {editingUser.id ? (
                <button
                  onClick={() => setConfirmSave(true)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition"
                >
                  Save Changes
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setEmail(editEmail);
                    setFirstName(editFirstName);
                    setLastName(editLastName);
                    setPhone(editPhone);
                    setAddress(editAddress);
                    setEditingUser(null);
                    await createUser();
                  }}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition"
                >
                  Create User
                </button>
              )}
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmSave && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 border border-yellow-500/30 p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Changes</h3>
            <p className="text-white/70 mb-6">Are you sure you want to save these changes?</p>
            
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setConfirmSave(false);
                  await saveEdit();
                }}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition"
              >
                Yes, Save
              </button>
              <button
                onClick={() => setConfirmSave(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Order History</h3>
                <p className="text-sm text-white/60 mt-1">
                  {historyUser.first_name} {historyUser.last_name}
                </p>
                <p className="text-xs text-white/40">{historyUser.email}</p>
              </div>
              <button
                onClick={() => setHistoryUser(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <div className="text-center py-10 text-white/60">Loading history...</div>
              ) : historyOrders.length === 0 ? (
                <div className="text-center py-10 text-white/40">No orders found for this user.</div>
              ) : (
                historyOrders.map((order) => (
                  <div key={order.id} className="bg-slate-800/40 border border-white/10 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm text-white/60">
                          {new Date(order.created_at).toLocaleString()}
                        </div>
                        <div className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold mt-2 ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'canceled' ? 'bg-red-500/20 text-red-400' :
                            order.status === 'out_for_delivery' ? 'bg-cyan-500/20 text-cyan-400' :
                              'bg-blue-500/20 text-blue-400'
                          }`}>
                          {order.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-400">€{order.total?.toFixed(2)}</div>
                        <div className="text-xs text-white/50">{order.order_items.length} items</div>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-white/10 pt-3">
                      {order.order_items.map((item: any) => {
                        const product = item.product || item.restaurant_item;
                        return (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-white/80">
                              {item.quantity}× {product?.name || "Unknown"}
                            </span>
                            <span className="text-white/60 font-semibold">
                              €{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setHistoryUser(null)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteUserId && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-red-500/30 w-full max-w-md">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">⚠️ Delete User</h2>
                <button
                  onClick={() => setDeleteUserId(null)}
                  className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-white/80 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteUserId(null)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(deleteUserId)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
