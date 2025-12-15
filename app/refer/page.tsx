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
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white px-4 py-10 sm:py-16">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    {/* Icon Badge */}
                    <div className="relative inline-flex mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                            <UserPlus size={36} className="text-white" />
                        </div>
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                        Refer a Friend
                    </h1>
                    <div className="w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto mb-6"></div>
                    <p className="text-white/70 text-lg leading-relaxed max-w-xl mx-auto">
                        Know someone who'd love our service? Share the love and help them get started with an account!
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-900/20 mb-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Your Name (Auto-filled) */}
                        <div>
                            <label className="block text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={referrerName}
                                disabled
                                className="w-full px-4 py-3.5 rounded-xl bg-slate-800/30 text-white/50 border border-slate-700/50 cursor-not-allowed font-medium"
                            />
                        </div>

                        {/* Friend's Info Section */}
                        <div className="pt-4 border-t border-slate-700/50">
                            <h3 className="text-lg font-semibold text-white/90 mb-4 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center border border-purple-500/30">
                                    <UserPlus size={16} className="text-purple-400" />
                                </div>
                                Friend's Information
                            </h3>

                            <div className="space-y-4">
                                {/* Friend's First Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        First Name <span className="text-pink-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={friendFirstName}
                                        onChange={(e) => setFriendFirstName(e.target.value)}
                                        placeholder="e.g., Artan"
                                        required
                                        className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 text-white border border-slate-700/50 placeholder-white/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                    />
                                </div>

                                {/* Friend's Last Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Last Name <span className="text-pink-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={friendLastName}
                                        onChange={(e) => setFriendLastName(e.target.value)}
                                        placeholder="e.g., Nuhiu"
                                        required
                                        className="w-full px-4 py-3.5 rounded-xl bg-slate-800/50 text-white border border-slate-700/50 placeholder-white/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                    />
                                </div>

                                {/* Friend's Phone */}
                                <div>
                                    <label className="block text-sm font-semibold text-white/80 mb-2">
                                        Phone Number <span className="text-pink-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="tel"
                                            value={friendPhone}
                                            onChange={(e) => setFriendPhone(e.target.value)}
                                            placeholder="+383 XX XXX XXX"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/50 text-white border border-slate-700/50 placeholder-white/30 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="group relative w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.02] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="relative">Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={20} className="relative" />
                                    <span className="relative">Submit Referral</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Back Link */}
                <div className="text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/50 rounded-xl text-sm font-medium transition-all hover:scale-105"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back to Home</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
