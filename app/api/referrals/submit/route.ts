import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { referrerName, friendFirstName, friendLastName, friendPhone } = body;

        // Validate required fields
        if (!friendFirstName || !friendLastName || !friendPhone) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Call Supabase Edge Function to send email
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        const emailResponse = await fetch(
            `${supabaseUrl}/functions/v1/send-referral-email`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseAnonKey}`,
                },
                body: JSON.stringify({
                    referrerName,
                    friendFirstName,
                    friendLastName,
                    friendPhone,
                }),
            }
        );

        if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("Email send failed:", errorText);
            return NextResponse.json(
                { error: "Failed to send referral email" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Referral submission error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
