// features/settings/components/billing-section.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  VStack,
  HStack,
} from "@hintboard/ui/component";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  Crown,
  Loader2,
} from "lucide-react";
import { UserService } from "@hintboard/supabase/services";

interface BillingSectionProps {
  organizationId: string;
}

interface SubscriptionData {
  status: "trialing" | "active" | "canceled" | "past_due";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
}

export function BillingSection({ organizationId }: BillingSectionProps) {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  // Fetch subscription data
  const { data: subscription, isLoading: isLoadingSubscription } =
    useQuery<SubscriptionData>({
      queryKey: ["subscription", organizationId],
      queryFn: async () => {
        const { createClient } = await import("@hintboard/supabase/client");
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("user_subscriptions")
          .select(
            "status, stripe_customer_id, stripe_subscription_id, trial_ends_at",
          )
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        return data;
      },
    });

  // Fetch trial days remaining
  const { data: trialDaysRemaining } = useQuery({
    queryKey: ["trialDaysRemaining"],
    queryFn: () => UserService.getTrialDaysRemaining("client"),
  });

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    setPortalError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to open billing portal");
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error("No portal URL returned");
      }

      window.location.href = url;
    } catch (error) {
      console.error("Error opening billing portal:", error);
      setPortalError(
        error instanceof Error
          ? error.message
          : "Failed to open billing portal. Please try again.",
      );
      setIsLoadingPortal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Payment Failed</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTrialMessage = () => {
    if (!trialDaysRemaining || trialDaysRemaining <= 0) return null;

    return (
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Trial Period Active
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            You have {trialDaysRemaining} day
            {trialDaysRemaining !== 1 ? "s" : ""} remaining in your trial.
            Subscribe now to continue accessing all features.
          </p>
        </div>
      </div>
    );
  };

  const getPastDueMessage = () => {
    if (subscription?.status !== "past_due") return null;

    return (
      <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-destructive">Payment Failed</p>
          <p className="text-sm text-destructive/80 mt-1">
            Your last payment failed. Please update your payment method to
            continue using the service.
          </p>
        </div>
      </div>
    );
  };

  if (isLoadingSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>
            Manage your subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Subscription</CardTitle>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VStack gap={6}>
          {/* Trial/Past Due Messages */}
          {getTrialMessage()}
          {getPastDueMessage()}

          {/* Subscription Status */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Subscription Status</h3>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Crown className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {subscription?.status === "active"
                        ? "Premium Plan"
                        : subscription?.status === "trialing"
                          ? "Trial Period"
                          : "No Active Subscription"}
                    </p>
                    {subscription?.status &&
                      getStatusBadge(subscription.status)}
                  </div>
                  {subscription?.trial_ends_at &&
                    subscription.status === "trialing" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Trial ends on{" "}
                        {new Date(
                          subscription.trial_ends_at,
                        ).toLocaleDateString()}
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            {subscription?.stripe_subscription_id && (
              <div>
                <h3 className="text-sm font-medium mb-3">
                  Subscription Details
                </h3>
                <VStack gap={3}>
                  <HStack gap={3} className="text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Payment Method:
                    </span>
                    <span className="font-medium">Managed via Stripe</span>
                  </HStack>

                  {subscription.trial_ends_at &&
                    subscription.status === "trialing" && (
                      <HStack gap={3} className="text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Trial Ends:
                        </span>
                        <span className="font-medium">
                          {new Date(
                            subscription.trial_ends_at,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </HStack>
                    )}
                </VStack>
              </div>
            )}

            {/* Error Message */}
            {portalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{portalError}</p>
              </div>
            )}

            {/* Manage Subscription Button */}
            {subscription?.stripe_customer_id && (
              <div className="pt-2">
                <Button
                  onClick={handleManageSubscription}
                  disabled={isLoadingPortal}
                  className="w-full sm:w-auto"
                >
                  {isLoadingPortal ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Subscription
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Update payment method, view invoices, or cancel subscription
                </p>
              </div>
            )}

            {/* No subscription - Show upgrade option */}
            {!subscription?.stripe_subscription_id && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-3">
                  You don't have an active subscription yet.
                </p>
                <Button variant="default" className="w-full sm:w-auto">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            )}
          </div>
        </VStack>
      </CardContent>
    </Card>
  );
}
