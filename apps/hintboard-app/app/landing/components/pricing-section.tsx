import React, { useState } from "react";
import { Check } from "lucide-react";

const PLANS = [
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited usage with security + SLA",
    custom: true,
    features: [
      "Unlimited boards",
      "Unlimited email subscribers",
      "Unlimited AI announcements",
      "Dedicated account manager",
      "Custom contracts & SLAs",
      "SSO / SAML & security reviews",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Advanced analytics and API access",
    monthlyPrice: 99,
    features: [
      "10 boards",
      "2,000 email subscribers",
      "50 AI announcements",
      "Advanced analytics",
      "API & custom integrations",
      "Priority support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description: "Scale to multiple boards and private sharing",
    monthlyPrice: 49,
    popular: true,
    features: [
      "3 boards",
      "500 email subscribers",
      "20 AI announcements",
      "Custom domains & remove branding",
      "Linear integration",
      "Private boards & multiple team members",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "Launch feedback with core AI assistance",
    monthlyPrice: 15,
    features: [
      "1 board",
      "100 email subscribers",
      "5 AI announcements",
      "Core collaboration tools",
    ],
  },
];

export default function PricingSection() {
  const [billingInterval, setBillingInterval] = useState("month");

  const getPrice = (plan: any) => {
    if (plan.custom) {
      return { display: "Contact sales", subtext: "Custom pricing" };
    }

    const monthlyPrice = plan.monthlyPrice;

    if (billingInterval === "year") {
      const yearlyPrice = monthlyPrice * 12 * 0.8; // 20% discount
      const monthlyEquivalent = yearlyPrice / 12;
      return {
        display: `€${Math.round(monthlyEquivalent)}`,
        subtext: `€${Math.round(yearlyPrice)} per year (billed annually)`,
      };
    }

    return {
      display: `€${monthlyPrice}`,
      subtext: "per month",
    };
  };

  return (
    <section id="pricing" className="py-16 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-gray-400">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-10 gap-3">
          <span className="text-sm font-medium text-gray-400">Billing</span>
          <div className="rounded-full bg-white/10 p-1 flex border border-white/10">
            <button
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition ${
                billingInterval === "month"
                  ? "bg-white text-black"
                  : "text-white hover:text-gray-300"
              }`}
              onClick={() => setBillingInterval("month")}
            >
              Monthly
            </button>
            <button
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                billingInterval === "year"
                  ? "bg-white text-black"
                  : "text-white hover:text-gray-300"
              }`}
              onClick={() => setBillingInterval("year")}
            >
              Annual
              <span className="text-xs text-orange-500 font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {PLANS.map((plan) => {
            const pricing = getPrice(plan);
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-5 flex flex-col hover:shadow-xl transition backdrop-blur-sm relative ${
                  isPopular
                    ? "border-2 border-orange-500 bg-gradient-to-br from-orange-500/10 to-amber-500/10 shadow-lg shadow-orange-500/20"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      {pricing.display}
                    </span>
                    {!plan.custom && (
                      <span className="text-gray-400 text-xs">
                        /{billingInterval === "month" ? "month" : "month"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {pricing.subtext}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-5 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-xs leading-tight">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() =>
                    (window.location.href = plan.custom
                      ? "/contact"
                      : "/signup")
                  }
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${
                    isPopular
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/30"
                      : plan.custom
                        ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                  }`}
                >
                  {plan.custom ? "Contact Sales" : "Start for Free"}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-400 text-sm mt-10">
          14-day free trial • No credit card required • Cancel anytime
        </p>
      </div>
    </section>
  );
}
