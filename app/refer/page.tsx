"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { UserPlus, Send } from "lucide-react";
import Link from "next/link";

export default function ReferFriendPage() {
    const [referrerName, setReferrerName] = useState("");
    const [friendFirstName, setFriendFirstName] = useState("");
    const [friendLastName, setFriendLastName] = useState("");
    const [friendPhone, setFriendPhone] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Get current user's name
    useEffect(() => {
        const loadUser = async () => {
            const uid = localStorage.getItem("dg_user_id");
            if (!uid) return;

            const { data } = await supabase
                .from("user_profiles")
                .select("first_name, last_name")
                .eq("id", uid)
                .single();

            if (data) {
                setReferrerName(`${data.first_name} ${data.last_name}`);
            }
        };

        loadUser();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!friendFirstName || !friendLastName || !friendPhone) {
            toast.error("Please fill in all fields");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/referrals/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    referrerName,
                    friendFirstName,
                    friendLastName,
                    friendPhone,
                }),
            });

            if (res.ok) {
                toast.success("Referral submitted! We'll contact your friend soon.");
                setFriendFirstName("");
                setFriendLastName("");
                setFriendPhone("");
            } else {
                toast.error("Failed to submit referral. Please try again.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white px-4 py-10">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Refer a Friend</h1>
                    <p className="text-white/60">
                        Know someone who'd love our service? Refer them and we'll create an account for them!
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Your Name (Auto-filled) */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Your Name
                        </label>
                        <input
                            type="text"
                            value={referrerName}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 text-white/50 border border-slate-700 cursor-not-allowed"
                        />
                    </div>

                    {/* Friend's First Name */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Friend's First Name *
                        </label>
                        <input
                            type="text"
                            value={friendFirstName}
                            onChange={(e) => setFriendFirstName(e.target.value)}
                            placeholder="Artan"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 text-white border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                        />
                    </div>

                    {/* Friend's Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Friend's Last Name *
                        </label>
                        <input
                            type="text"
                            value={friendLastName}
                            onChange={(e) => setFriendLastName(e.target.value)}
                            placeholder="Nuhiu"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 text-white border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                        />
                    </div>

                    {/* Friend's Phone */}
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">
                            Friend's Phone Number *
                        </label>
                        <input
                            type="tel"
                            value={friendPhone}
                            onChange={(e) => setFriendPhone(e.target.value)}
                            placeholder="+383 XX XXX XXX"
                            required
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 text-white border border-slate-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-purple-500/20"
                    >
                        {submitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send size={20} />
                                Submit Referral
                            </>
                        )}
                    </button>
                </form>

                {/* Info Box */}
                <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <h3 className="font-semibold mb-2 text-purple-400">What happens next?</h3>
                    <ul className="text-sm text-white/60 space-y-2">
                        <li>✓ We'll receive your friend's details</li>
                        <li>✓ We'll create an account for them</li>
                        <li>✓ We'll contact them to welcome them</li>
                        <li>✓ They can start ordering right away!</li>
                    </ul>
                </div>

                {/* Back Link */}
                <div className="mt-6 text-center">
                    <Link
                        href="/"
                        className="text-purple-400 hover:text-purple-300 text-sm font-medium transition"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
