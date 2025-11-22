import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

interface FormattedPrice {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  nickname: string | null;
  isActive: boolean;
  planTier: PlanTier | null;
  productId: string | null;
  productName: string | null;
}

type PlanTier = "starter" | "growth" | "pro" | "enterprise";

export async function GET(request: NextRequest) {
  try {
    const productEnv =
      process.env.STRIPE_PRODUCT_IDS || process.env.STRIPE_PRODUCT_ID || "";
    const productIds = productEnv
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (productIds.length === 0) {
      console.warn("⚠️ No product IDs configured in environment variables");
      return NextResponse.json(
        {
          error:
            "Pricing not configured. Set STRIPE_PRODUCT_IDS in environment.",
        },
        { status: 500 },
      );
    }

    // Fetch product details to get names
    const productMap = new Map<string, string>();

    for (const productId of productIds) {
      try {
        const product = await stripe.products.retrieve(productId);
        productMap.set(productId, product.name);
        console.log(`📦 Product ${productId}: ${product.name}`);
      } catch (error) {
        console.error(`⚠️ Failed to fetch product ${productId}:`, error);
      }
    }

    let stripePrices: Stripe.Price[] = [];

    // Fetch prices for each product ID
    for (const productId of productIds) {
      console.log("🔍 Fetching prices for product:", productId);
      const { data } = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 100,
      });
      stripePrices = stripePrices.concat(data);
    }

    console.log(`📊 Found ${stripePrices.length} active prices`);

    const formattedPrices: FormattedPrice[] = stripePrices
      .filter(
        (price) =>
          price.active &&
          (price.type === "recurring" || price.recurring !== null),
      )
      .map((price) => {
        const amount = price.unit_amount ? price.unit_amount / 100 : 0;
        const interval = price.recurring?.interval || "one-time";
        const intervalCount = price.recurring?.interval_count || 1;
        const productId =
          typeof price.product === "string"
            ? price.product
            : price.product?.id || null;
        const productName = productId
          ? productMap.get(productId) || null
          : null;

        // Identify plan tier from product name instead of nickname
        const planTier = identifyPlanFromProductName(productName);

        console.log(
          `💰 Price ${price.id}: ${productName} - ${amount} ${price.currency}/${interval}`,
          `planTier: ${planTier}`,
        );

        return {
          id: price.id,
          amount,
          currency: price.currency.toUpperCase(),
          interval,
          intervalCount,
          nickname: price.nickname || null,
          isActive: price.active,
          planTier,
          productId,
          productName,
        };
      });

    // Sort by normalized monthly price
    formattedPrices.sort((a, b) => {
      const normalize = (p: FormattedPrice) =>
        p.interval === "year" ? p.amount / 12 : p.amount;
      return normalize(a) - normalize(b);
    });

    console.log("✅ Prices formatted and sorted");

    return NextResponse.json({
      prices: formattedPrices,
      products: productIds,
      productMap: Object.fromEntries(productMap),
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

/**
 * Identify plan tier from Stripe product name
 * Works with any product name containing the plan keywords
 */
function identifyPlanFromProductName(
  productName: string | null | undefined,
): "starter" | "growth" | "pro" | "enterprise" | null {
  if (!productName) return null;
  const lower = productName.toLowerCase();

  if (lower.includes("starter")) return "starter";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("pro")) return "pro";
  if (lower.includes("enterprise")) return "enterprise";

  return null;
}
