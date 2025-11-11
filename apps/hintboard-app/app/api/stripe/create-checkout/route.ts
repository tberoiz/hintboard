import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@hintboard/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("❌ Authentication error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ User authenticated:", user.id);

    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

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

    let customer;
    if (existingSub?.stripe_customer_id) {
      console.log("🔍 Retrieving existing Stripe customer");
      customer = await stripe.customers.retrieve(
        existingSub.stripe_customer_id,
      );
    } else {
      console.log("✨ Creating new Stripe customer");
      customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });

      if (existingSub) {
        await supabase
          .from("user_subscriptions")
          .update({ stripe_customer_id: customer.id })
          .eq("user_id", user.id);
      }
    }

    console.log("👤 Stripe customer ID:", customer.id);

    const price = await stripe.prices.retrieve(priceId);
    const interval = price.recurring?.interval || "month";

    console.log("📅 Billing interval:", interval);

    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
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
