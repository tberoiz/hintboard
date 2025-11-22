import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@hintboard/supabase/server";

const stripeCheckout = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { priceId } = body;

    console.log("🔔 Stripe checkout request:", { priceId });

    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 },
      );
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    // Check existing subscription
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", user.id)
      .single();

    // Check if user has active access
    const { data: hasAccess } = await supabase.rpc("user_has_access", {
      user_id: user.id,
    });

    if (hasAccess && existingSub?.status === "active") {
      console.log("⚠️ User already has active subscription");
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 },
      );
    }

    // Get or create Stripe customer
    let customerId: string;

    if (existingSub?.stripe_customer_id) {
      console.log("🔍 Using existing Stripe customer");
      customerId = existingSub.stripe_customer_id;
    } else {
      console.log("✨ Creating new Stripe customer");
      const customer = await stripeCheckout.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      console.log("👤 Stripe customer created:", customerId);

      // Save customer ID if subscription record exists
      if (existingSub) {
        await supabase
          .from("user_subscriptions")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
      }
    }

    // Retrieve price to get billing interval
    const price = await stripeCheckout.prices.retrieve(priceId);
    const interval = price.recurring?.interval || "month";

    console.log("📅 Billing interval:", interval);

    // Build success/cancel URLs
    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    // Create checkout session
    const session = await stripeCheckout.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          billing_interval: interval,
        },
      },
      success_url: `${baseUrl}/ideas?upgrade=success`,
      cancel_url: `${baseUrl}/ideas?upgrade=cancelled`,
      allow_promotion_codes: true,
    });

    console.log("✅ Checkout session created:", session.id);
    console.log("🔗 Checkout URL:", session.url);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
