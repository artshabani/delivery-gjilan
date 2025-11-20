import { NextResponse } from "next/server";
import { planOrderOptimized, planOrderWithOptions } from "@/lib/order-planning";
import type { CartItem } from "@/types/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cartItems, customerPrices, includeOptions = false } = body;

    // Validation
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "cartItems must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!customerPrices || typeof customerPrices !== "object") {
      return NextResponse.json(
        { error: "customerPrices must be an object mapping product_id to price" },
        { status: 400 }
      );
    }

    // Validate cart items structure
    for (const item of cartItems) {
      if (!item.product_id || !item.quantity) {
        return NextResponse.json(
          { error: "Each cart item must have product_id and quantity" },
          { status: 400 }
        );
      }
    }

    // Plan the order
    if (includeOptions) {
      // Return multiple options
      const options = await planOrderWithOptions(
        cartItems as CartItem[],
        customerPrices as Record<number, number>
      );
      return NextResponse.json({ options });
    } else {
      // Return single plan (backward compatible)
      const plan = await planOrderOptimized(
        cartItems as CartItem[],
        customerPrices as Record<number, number>
      );
      return NextResponse.json({ plan });
    }
  } catch (err: any) {
    console.error("Order planning error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to plan order" },
      { status: 500 }
    );
  }
}





