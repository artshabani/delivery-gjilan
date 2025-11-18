// @ts-ignore Deno env wrapper
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore allow npm imports in Deno
import { Resend } from "npm:resend";
// @ts-ignore allow npm imports in Deno
import { createClient } from "npm:@supabase/supabase-js";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role for reading user profiles
);

serve(async (req: Request): Promise<Response> => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers });
  }

  try {
    const { orderId, total, items, userId } = await req.json();

    console.log("📨 Incoming order payload:", { orderId, total, items, userId });

    /* ---------------------------------------------------------
        Load customer info from user_profiles
    --------------------------------------------------------- */
    const { data: userData } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, phone, address, id")
      .eq("id", userId)
      .single();

    const firstName = userData?.first_name || "Unknown";
    const lastName = userData?.last_name || "";
    const phone = userData?.phone || "N/A";
    const address = userData?.address || "N/A";

    /* ---------------------------------------------------------
        Build items HTML
    --------------------------------------------------------- */
    const itemsHtml = items
      .map((item: any) => {
        const lineTotal = (item.quantity * item.price).toFixed(2);

        return `
          <tr style="border-bottom:1px solid #e5e5e5;">
            <td style="padding:10px 0; width:60px;">
              <img 
                src="${item.image_url || "https://via.placeholder.com/60"}"
                width="55"
                height="55"
                style="border-radius:8px; object-fit:contain;"
              />
            </td>

            <td align="left" style="padding:10px 0; font-size:14px;">
              <strong>${item.name}</strong>
              ${item.notes ? `<br/><em>📝 ${item.notes}</em>` : ""}
              ${
                item.modifiers
                  ? `<br/><span style="color:#777;">Options: ${Object.keys(item.modifiers)
                      .filter((k) => item.modifiers[k])
                      .join(", ")}</span>`
                  : ""
              }
              <br/>
              <span style="color:#666;">€${item.price.toFixed(2)} each</span>
            </td>

            <td align="center" style="padding:10px 0; font-size:14px;">
              ${item.quantity}
            </td>

            <td align="right" style="padding:10px 0; font-size:14px;">
              €${lineTotal}
            </td>
          </tr>
        `;
      })
      .join("");

    /* ---------------------------------------------------------
        Full EMAIL Template
    --------------------------------------------------------- */
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 20px;">
        <h2 style="color:#6D28D9; margin-bottom:5px;">🛒 New Order #${orderId}</h2>

        <div style="margin:15px 0; padding:12px; background:#f3e8ff; border-radius:8px;">
          <strong>Ordered by:</strong><br/>
          ${firstName} ${lastName}<br/>
          📞 ${phone}<br/>
          📍 ${address}
        </div>

        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse; margin-top:20px;">
          <thead>
            <tr style="background:#f4f4f4;">
              <th align="left" style="padding:8px 0; font-weight:600;">Item</th>
              <th align="center" style="padding:8px 0; font-weight:600;">Qty</th>
              <th align="right" style="padding:8px 0; font-weight:600;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <h3 style="text-align:right; margin-top:20px;">Total: €${total.toFixed(2)}</h3>

        <p style="margin-top:30px; font-size:12px; color:#888;">
          Delivery Gjilan – Fastest delivery in town 🚀<br/>
          This email was automatically generated.
        </p>
      </div>
    `;

    /* ---------------------------------------------------------
        Send the email
    --------------------------------------------------------- */
    const subject = `🔥 New order from ${firstName} ${lastName}`; // <-- MODIFIED SUBJECT LINE
    
    await resend.emails.send({
      from: "Delivery Gjilan <onboarding@resend.dev>",
      to: "artshabani2002@gmail.com",
      subject: subject, // Use the new subject variable
      html,
    });

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.log("❌ ERROR:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers,
    });
  }
});