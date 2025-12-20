import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userName, items } = body;

    // Get Telegram credentials from environment variables
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error("Missing Telegram credentials");
      return NextResponse.json(
        { error: "Telegram credentials not configured" },
        { status: 500 }
      );
    }

    // Group items by restaurant
    const itemsByRestaurant: { [key: string]: any[] } = {};
    
    items.forEach((item: any) => {
      const restaurantKey = item.restaurant_name || "Grocery";
      if (!itemsByRestaurant[restaurantKey]) {
        itemsByRestaurant[restaurantKey] = [];
      }
      itemsByRestaurant[restaurantKey].push(item);
    });

    // Format items grouped by restaurant
    const itemsList = Object.entries(itemsByRestaurant)
      .map(([restaurant, restaurantItems]) => {
        const items = restaurantItems
          .map((item: any) => `• ${item.name} x${item.quantity}`)
          .join("\n");
        return `<b>${restaurant}</b>\n${items}`;
      })
      .join("\n\n");

    // Create message
    const message = `
<b>📦 POROSI E RE</b>

👤 <b>${userName}</b>

${itemsList}

⏰ <i>${new Date().toLocaleString('sq-AL', { timeZone: 'Europe/Tirane' })}</i>
    `.trim();

    // Send to Telegram (text only)
    const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error("Telegram API error:", telegramData);
      return NextResponse.json(
        { error: "Failed to send Telegram notification", details: telegramData },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: telegramData });
  } catch (error) {
    console.error("Telegram notification error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
