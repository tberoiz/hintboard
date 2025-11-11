import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function GET(request: NextRequest) {
  try {
    const productId = process.env.STRIPE_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID not configured" },
        { status: 500 },
      );
    }

    console.log("🔍 Fetching prices for product:", productId);

    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    console.log("✅ Found", prices.data.length, "price(s)");

    const formattedPrices = prices.data.map((price) => ({
      id: price.id,
      amount: price.unit_amount ? price.unit_amount / 100 : 0,
      currency: price.currency,
      interval: price.recurring?.interval || "one-time",
      intervalCount: price.recurring?.interval_count || 1,
      nickname: price.nickname,
      isActive: price.active,
    }));

    formattedPrices.sort((a, b) => {
      const aMonthly = a.interval === "year" ? a.amount / 12 : a.amount;
      const bMonthly = b.interval === "year" ? b.amount / 12 : b.amount;
      return aMonthly - bMonthly;
    });

    return NextResponse.json({
      prices: formattedPrices,
      productId,
    });
  } catch (error) {
    console.error("❌ Error fetching prices:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
