import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@hintboard/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Get user's Stripe customer ID
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      console.error("❌ No subscription found for user:", user.id);
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    console.log("👤 Stripe customer ID:", subscription.stripe_customer_id);

    // Get current host for return URL
    const host = request.headers.get("host");
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const returnUrl = `${protocol}://${host}/ideas`;

    console.log("🌐 Return URL:", returnUrl);

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl,
    });

    console.log("✅ Portal session created:", portalSession.id);
    console.log("🔗 Portal URL:", portalSession.url);

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("❌ Error creating portal session:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
