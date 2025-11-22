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

type PlanTier = "starter" | "growth" | "pro" | "enterprise";
type BillingInterval = "month" | "year";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialDaysRemaining: number | null;
  organizationName?: string;
}

interface StripePriceData {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  nickname: string | null;
  isActive: boolean;
  planTier: PlanTier | null;
  productId: string | null;
}

interface PlanDefinition {
  id: PlanTier;
  name: string;
  description: string;
  limits: {
    boards: number;
    emailSubscribers: number;
    aiAnnouncements: number;
  };
  extras: string[];
  highlight?: string;
  contactOnly?: boolean;
}

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Launch feedback with core AI assistance",
    limits: {
      boards: 1,
      emailSubscribers: 100,
      aiAnnouncements: 5,
    },
    extras: ["Core collaboration tools"],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Scale to multiple boards and private sharing",
    limits: {
      boards: 3,
      emailSubscribers: 500,
      aiAnnouncements: 20,
    },
    extras: [
      "Custom domains & remove branding",
      "Linear integration",
      "Private boards & multiple team members",
    ],
    highlight: "Most Popular",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Advanced analytics and API access",
    limits: {
      boards: 10,
      emailSubscribers: 2000,
      aiAnnouncements: 50,
    },
    extras: [
      "Advanced analytics",
      "API & custom integrations",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited usage with security + SLA",
    limits: {
      boards: -1,
      emailSubscribers: -1,
      aiAnnouncements: -1,
    },
    extras: [
      "Dedicated account manager",
      "Custom contracts & SLAs",
      "SSO / SAML & security reviews",
    ],
    contactOnly: true,
  },
];

export function UpgradeModal({
  open,
  onOpenChange,
  trialDaysRemaining,
  organizationName,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("growth");
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("month");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePrices, setStripePrices] = useState<StripePriceData[]>([]);

  // Fetch prices when modal opens
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
      console.log("📊 Prices fetched:", data.prices);
      setStripePrices(data.prices);
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

  const getPriceForPlan = (
    planId: PlanTier,
    interval: BillingInterval,
  ): StripePriceData | undefined => {
    return stripePrices.find(
      (price) => price.planTier === planId && price.interval === interval,
    );
  };

  const handleUpgrade = async (planId: PlanTier) => {
    if (planId === "enterprise") {
      window.location.href =
        "mailto:hello@hintboard.com?subject=Hintboard%20Enterprise%20Plan";
      return;
    }

    const priceData = getPriceForPlan(planId, billingInterval);

    if (!priceData) {
      setError(
        "Selected billing option is unavailable. Please try another plan or contact support.",
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceData.id,
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
    } finally {
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

  const formatLimit = (value: number, label: string) => {
    if (value === -1) return `Unlimited ${label}`;
    return `${value.toLocaleString()} ${label}`;
  };

  const getPlanPriceDisplay = (plan: PlanDefinition) => {
    const priceData = getPriceForPlan(plan.id, billingInterval);

    if (!priceData && plan.id !== "enterprise") {
      return {
        label: "Coming soon",
        subLabel: "Pricing not available",
        amount: null,
      };
    }

    if (!priceData || plan.id === "enterprise") {
      return {
        label: "Contact sales",
        subLabel: "Custom pricing",
        amount: null,
      };
    }

    const currencySymbol = getCurrencySymbol(priceData.currency);
    const amount = priceData.amount;

    if (billingInterval === "year") {
      const monthlyEquivalent = (amount / 12).toFixed(0);
      return {
        label: `${currencySymbol}${monthlyEquivalent}`,
        subLabel: `${currencySymbol}${amount} per year (billed annually)`,
        amount,
      };
    }

    return {
      label: `${currencySymbol}${amount}`,
      subLabel: "per month",
      amount,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[75vw] max-h-[80vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 sm:px-10 pt-6 pb-4">
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
          <div className="px-6 sm:px-10 py-20 flex items-center justify-center">
            <VStack gap={3} align="center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading pricing...
              </p>
            </VStack>
          </div>
        )}

        {/* Error State */}
        {!isFetchingPrices && error && (
          <div className="px-6 sm:px-10 py-4">
            <div className="w-full p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
            <Button onClick={fetchPrices} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Pricing Plans */}
        {!isFetchingPrices && !error && (
          <>
            <div className="px-4 sm:px-6 lg:px-10 py-4">
              <div className="flex items-center justify-center mb-6 gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Billing
                </span>
                <div className="rounded-full bg-muted p-1 flex">
                  <Button
                    size="sm"
                    variant={billingInterval === "month" ? "default" : "ghost"}
                    className="rounded-full"
                    onClick={() => setBillingInterval("month")}
                  >
                    Monthly
                  </Button>
                  <Button
                    size="sm"
                    variant={billingInterval === "year" ? "default" : "ghost"}
                    className="rounded-full"
                    onClick={() => setBillingInterval("year")}
                  >
                    Annual
                    <span className="ml-2 text-xs text-amber-500">
                      Save 20%
                    </span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {PLAN_DEFINITIONS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const priceDisplay = getPlanPriceDisplay(plan);

                  return (
                    <div
                      key={plan.id}
                      className={cn(
                        "relative rounded-xl border-2 p-4 sm:p-5 cursor-pointer transition-all flex flex-col min-w-0",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-lg"
                          : "border-border hover:border-primary/50 hover:shadow-md",
                        plan.highlight &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {plan.highlight && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-3 py-1">
                          <Crown className="h-3 w-3 mr-1" />
                          {plan.highlight}
                        </Badge>
                      )}

                      <VStack gap={3} className="flex-1 w-full">
                        <VStack gap={0.5} className="w-full">
                          <div className="flex items-center justify-between w-full gap-2">
                            <h3 className="text-lg sm:text-xl font-bold truncate">
                              {plan.name}
                            </h3>
                            {plan.contactOnly && (
                              <Badge variant="outline" className="shrink-0">
                                Contact
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground break-words">
                            {plan.description}
                          </p>
                        </VStack>

                        <div className="w-full">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {priceDisplay.amount !== null ? (
                              <>
                                <span className="text-3xl sm:text-4xl font-bold">
                                  {priceDisplay.label}
                                </span>
                                <span className="text-sm sm:text-base text-muted-foreground">
                                  /{billingInterval}
                                </span>
                              </>
                            ) : (
                              <span className="text-xl sm:text-2xl font-semibold">
                                {priceDisplay.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            {priceDisplay.subLabel}
                          </p>
                        </div>

                        <VStack gap={1} align="stretch" className="w-full">
                          <HStack gap={2} align="start">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm leading-tight">
                              {formatLimit(plan.limits.boards, "boards")}
                            </span>
                          </HStack>
                          <HStack gap={2} align="start">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm leading-tight">
                              {formatLimit(
                                plan.limits.emailSubscribers,
                                "email subscribers",
                              )}
                            </span>
                          </HStack>
                          <HStack gap={2} align="start">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm leading-tight">
                              {formatLimit(
                                plan.limits.aiAnnouncements,
                                "AI announcements",
                              )}
                            </span>
                          </HStack>
                        </VStack>

                        <VStack gap={1.5} align="stretch" className="w-full">
                          {plan.extras.map((feature, index) => (
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
                          ) : plan.contactOnly ? (
                            "Contact Sales"
                          ) : (
                            "Select Plan"
                          )}
                        </Button>
                      </VStack>
                    </div>
                  );
                })}
              </div>
            </div>

            <VStack gap={2} className="px-4 sm:px-6 lg:px-10 py-4 border-t">
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
                ) : selectedPlan === "enterprise" ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Contact Sales
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
