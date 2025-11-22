// app/api/stripe/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServerClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Disable body parsing - CRITICAL for webhook signature verification
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ No stripe-signature header found");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`✅ Webhook verified: ${event.type} [${event.id}]`);
  } catch (err) {
    const error = err as Error;
    console.error("❌ Webhook signature verification failed:", error.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      default:
        console.log(`ℹ️  Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id;

  if (!userId) {
    console.error("❌ No supabase_user_id in subscription metadata");
    console.log("Subscription ID:", subscription.id);
    return;
  }

  const status = mapStripeStatus(subscription.status);

  // Get the price ID from the subscription
  const priceId =
    typeof subscription.items.data[0]?.price?.id === "string"
      ? subscription.items.data[0].price.id
      : null;

  let planId: string | null = null;

  // If we have a price ID, try to identify the plan
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);

      // Get the product ID from the price
      const productId =
        typeof price.product === "string" ? price.product : price.product?.id;

      if (productId) {
        // Fetch the product to get its name
        const product = await stripe.products.retrieve(productId);
        const planTier = identifyPlanFromProductName(product.name);

        if (planTier) {
          // Look up the plan_id from subscription_plans table
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("name", planTier)
            .single();

          if (plan?.id) {
            planId = plan.id;
            console.log(
              `📦 Identified plan: ${planTier} (plan_id: ${planId}) from product: ${product.name}`,
            );
          } else {
            console.warn(
              `⚠️ Plan tier ${planTier} not found in subscription_plans table`,
            );
          }
        } else {
          console.warn(
            `⚠️ Could not identify plan from product name: ${product.name}`,
          );
        }
      }
    } catch (error) {
      console.error("❌ Error fetching price or product info:", error);
    }
  }

  console.log(`📝 Updating subscription for user ${userId}:`, {
    subscriptionId: subscription.id,
    status,
    planId,
  });

  // Update subscription with plan_id - this is all we need!
  // The get_user_plan_limits() function will automatically use the new plan's limits
  const updateData: {
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    updated_at: string;
    plan_id?: string | null;
  } = {
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status,
    updated_at: new Date().toISOString(),
  };

  if (planId) {
    updateData.plan_id = planId;
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update(updateData)
    .eq("user_id", userId);

  if (error) {
    console.error("❌ Failed to update subscription:", error);
  } else {
    console.log(`✅ Subscription updated for user ${userId}`);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.supabase_user_id;
  if (!userId) return;

  console.log(`🚫 Canceling subscription for user ${userId}`);

  // Get starter plan_id to revert user to free tier
  const { data: starterPlan } = await supabase
    .from("subscription_plans")
    .select("id")
    .eq("name", "starter")
    .single();

  const updateData: {
    status: string;
    updated_at: string;
    plan_id?: string | null;
  } = {
    status: "canceled",
    updated_at: new Date().toISOString(),
  };

  if (starterPlan?.id) {
    updateData.plan_id = starterPlan.id;
    console.log(`📦 Reverting to starter plan (plan_id: ${starterPlan.id})`);
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .update(updateData)
    .eq("user_id", userId);

  if (error) {
    console.error("❌ Failed to cancel subscription:", error);
  } else {
    console.log(`✅ Subscription canceled for user ${userId}`);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId = invoice.subscription as string;
  console.log(`💰 Payment succeeded for subscription ${subscriptionId}`);

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id, status")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (sub?.user_id && sub.status === "past_due") {
    await supabase
      .from("user_subscriptions")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);

    console.log(`✅ Reactivated subscription for user ${sub.user_id}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscriptionId = invoice.subscription as string;
  console.log(`❌ Payment failed for subscription ${subscriptionId}`);

  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (sub?.user_id) {
    await supabase
      .from("user_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId);

    console.log(`⚠️ Subscription marked past_due for user ${sub.user_id}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`✅ Checkout completed: ${session.id}`);

  if (session.subscription) {
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    console.log(`📝 Fetching subscription: ${subscriptionId}`);

    try {
      // Fetch the full subscription object to trigger plan update
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await handleSubscriptionUpdate(subscription);
    } catch (error) {
      console.error("❌ Error fetching subscription after checkout:", error);
    }
  }
}

function mapStripeStatus(
  stripeStatus: string,
): "trialing" | "active" | "canceled" | "past_due" {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "past_due":
    case "incomplete":
      return "past_due";
    default:
      return "canceled";
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
