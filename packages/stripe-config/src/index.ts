import Stripe from "stripe";

// Initialize Stripe with your secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Plan IDs from your Supabase plans table
export const PLAN_IDS = {
  FREE: "price_free",
  PRO: "price_pro",
  PREMIUM: "price_premium",
} as const;

// Helper function to create a Stripe checkout session
export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

// Helper function to create a Stripe customer portal session
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Helper function to cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Helper function to reactivate a subscription
export async function reactivateSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Helper function to get a subscription
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Helper function to get a customer
export async function getCustomer(customerId: string) {
  return stripe.customers.retrieve(customerId);
}

// Helper function to create a customer
export async function createCustomer(email: string) {
  return stripe.customers.create({
    email,
  });
}

// Helper function to update a customer's subscription
export async function updateSubscription({
  subscriptionId,
  priceId,
}: {
  subscriptionId: string;
  priceId: string;
}) {
  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        price: priceId,
      },
    ],
  });
}
