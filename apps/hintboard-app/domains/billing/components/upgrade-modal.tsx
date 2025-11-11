import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  VStack,
  HStack,
  Badge,
} from "@hintboard/ui/component";
import { Check, Zap, Crown, Loader2 } from "lucide-react";
import { cn } from "@hintboard/ui/utils";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialDaysRemaining: number | null;
  organizationName?: string;
}

interface StripePrice {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  nickname: string | null;
  isActive: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  description: string;
  features: string[];
  popular?: boolean;
  stripePriceId: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  trialDaysRemaining,
  organizationName,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);

  // Fetch prices from Stripe when modal opens
  useEffect(() => {
    if (open) {
      fetchPrices();
    }
  }, [open]);

  const fetchPrices = async () => {
    setIsFetchingPrices(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/prices");

      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }

      const data = await response.json();
      const stripePrices: StripePrice[] = data.prices;

      // Find monthly and yearly prices
      const monthlyPrice = stripePrices.find((p) => p.interval === "month");
      const yearlyPrice = stripePrices.find((p) => p.interval === "year");

      if (!monthlyPrice) {
        throw new Error("Monthly price not found in Stripe");
      }

      // Build plans dynamically from Stripe prices
      const dynamicPlans: PricingPlan[] = [];

      // Monthly plan
      dynamicPlans.push({
        id: "monthly",
        name: "Monthly",
        price: monthlyPrice.amount,
        currency: monthlyPrice.currency.toUpperCase(),
        interval: "month",
        description: "Perfect for getting started",
        stripePriceId: monthlyPrice.id,
        features: [
          "Unlimited ideas",
          "Unlimited team members",
          "Custom statuses & topics",
          "Private feedback boards",
          "Email notifications",
          "Advanced analytics",
          "Priority support",
        ],
      });

      // Yearly plan (if exists)
      if (yearlyPrice) {
        const savings = Math.round(
          ((monthlyPrice.amount * 12 - yearlyPrice.amount) /
            (monthlyPrice.amount * 12)) *
            100,
        );

        dynamicPlans.push({
          id: "yearly",
          name: "Yearly",
          price: yearlyPrice.amount,
          currency: yearlyPrice.currency.toUpperCase(),
          interval: "year",
          description: `Save ${savings}% with annual billing`,
          stripePriceId: yearlyPrice.id,
          features: [
            "Everything in Monthly",
            `${12 - Math.floor(yearlyPrice.amount / monthlyPrice.amount)} months free`,
            "Priority feature requests",
            "Dedicated account manager",
            "Custom integrations",
            "SLA guarantee",
          ],
          popular: true,
        });
      }

      setPlans(dynamicPlans);

      // Default to yearly if available, otherwise monthly
      if (yearlyPrice) {
        setSelectedPlan("yearly");
      }
    } catch (err) {
      console.error("Error fetching prices:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load pricing. Please try again.",
      );
    } finally {
      setIsFetchingPrices(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) {
        throw new Error("Plan not found");
      }

      console.log("Creating checkout session:", {
        planId,
        stripePriceId: plan.stripePriceId,
      });

      // THIS IS THE CRITICAL PART - Make sure you're sending priceId
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId, // ← MUST be priceId, not interval
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      if (!url) {
        throw new Error("No checkout URL returned");
      }

      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    };
    return symbols[currency.toUpperCase()] || currency;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] p-0 gap-0">
        <DialogHeader className="px-10 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold">
            Upgrade {organizationName || "Your Organization"}
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {trialDaysRemaining !== null && trialDaysRemaining > 0 ? (
              <>
                You have {trialDaysRemaining} day
                {trialDaysRemaining !== 1 ? "s" : ""} left in your trial.
                Upgrade now to continue using all features.
              </>
            ) : (
              <>
                Choose a plan to unlock unlimited access and premium features
                for your team.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isFetchingPrices && (
          <div className="px-10 py-20 flex items-center justify-center">
            <VStack gap={3} align="center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading pricing...
              </p>
            </VStack>
          </div>
        )}

        {/* Error State */}
        {!isFetchingPrices && error && plans.length === 0 && (
          <div className="px-10 py-20">
            <VStack gap={4} align="center">
              <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
              <Button onClick={fetchPrices} variant="outline">
                Try Again
              </Button>
            </VStack>
          </div>
        )}

        {/* Pricing Plans */}
        {!isFetchingPrices && plans.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-6 px-10 py-4">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const monthlyPrice =
                  plan.interval === "year" ? plan.price / 12 : plan.price;
                const currencySymbol = getCurrencySymbol(plan.currency);

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative rounded-xl border-2 p-5 cursor-pointer transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-lg"
                        : "border-border hover:border-primary/50 hover:shadow-md",
                      plan.popular &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1">
                        <Crown className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    )}

                    <VStack gap={3.5} className="h-full">
                      <VStack gap={0.5}>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {plan.description}
                        </p>
                      </VStack>

                      <VStack gap={0}>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">
                            {currencySymbol}
                            {plan.price}
                          </span>
                          <span className="text-base text-muted-foreground">
                            /{plan.interval}
                          </span>
                        </div>
                        {plan.interval === "year" && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {currencySymbol}
                            {monthlyPrice.toFixed(0)}/month billed annually
                          </p>
                        )}
                      </VStack>

                      <VStack gap={1.5} className="flex-1">
                        {plan.features.map((feature, index) => (
                          <HStack key={index} gap={2} align="start">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm leading-tight">
                              {feature}
                            </span>
                          </HStack>
                        ))}
                      </VStack>

                      <Button
                        className="w-full mt-2 h-10"
                        variant={isSelected ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          "Select Plan"
                        )}
                      </Button>
                    </VStack>
                  </div>
                );
              })}
            </div>

            <VStack gap={2} className="px-10 py-4">
              {error && (
                <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive text-center">
                    {error}
                  </p>
                </div>
              )}

              <Button
                className="w-full h-11"
                size="lg"
                onClick={() => handleUpgrade(selectedPlan)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Continue to Payment
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Secure payment powered by Stripe • Cancel anytime
              </p>
            </VStack>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
