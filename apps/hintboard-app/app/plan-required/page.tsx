"use client";

import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  VStack,
  HStack,
  Spinner,
} from "@hintboard/ui/component";
import { CreditCard, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { HintboardIcon } from "@/shared/icons/icons";
import Link from "next/link";
import { z } from "zod";

const PlanRequiredPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [error, setError] = useState("");

  const amountSchema = z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), { message: "Must be a number" })
    .transform((val) => parseFloat(val))
    .refine((val) => val >= 12, { message: "Minimum amount is €12" });

  const handleCheckout = async (amount: number) => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: "early-access",
          amount,
        }),
      });

      if (!response.ok) throw new Error("Failed to create checkout session");

      const { url } = await response.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL received");
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Failed to initiate checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    try {
      setError("");
      const validatedAmount = amountSchema.parse(customAmount);
      handleCheckout(validatedAmount * 100);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0]?.message ?? "Invalid amount entered");
      } else {
        setError("Invalid amount entered");
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="absolute inset-0">
        {/*<Image
          src="/brand/.png"
          alt="Background"
          fill
          className="object-cover opacity-10"
        />*/}
      </div>
      <div className="absolute inset-0 bg-background/10" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-lg shadow-2xl border-border/50 backdrop-blur-sm relative">
          {/* Back Button Top-Left */}
          {useCustom && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setUseCustom(false);
                setError("");
                setCustomAmount("");
              }}
              className="absolute top-4 left-4 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <CardHeader className="text-center pb-8">
            <VStack gap={6} align="center">
              <div className="w-12 h-12">
                <HintboardIcon />
              </div>
              <VStack gap={3} align="center">
                <CardTitle className="text-2xl font-light">
                  Trial Expired
                </CardTitle>
                <p className="text-muted-foreground text-base leading-relaxed max-w-md">
                  Hope you&apos;ve enjoyed using hintboard so far! Your trial
                  has now ended. Continue with early access.
                </p>
              </VStack>
            </VStack>
          </CardHeader>

          <CardContent className="pt-0">
            <VStack gap={8}>
              {/* Pricing */}
              {!useCustom && (
                <div className="text-center py-6 px-4 rounded-lg bg-muted/20 border border-border/30">
                  <VStack gap={3} align="center">
                    <HStack gap={2} align="baseline" justify="center">
                      <span className="text-5xl font-light">€12</span>
                      <span className="text-muted-foreground text-lg">
                        / month
                      </span>
                    </HStack>
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      Early Access Plan
                    </Badge>
                  </VStack>
                </div>
              )}

              {/* Custom Amount Card */}
              {useCustom && (
                <VStack gap={2} className="w-full">
                  <input
                    type="number"
                    min={12}
                    step={0.01}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount (€)"
                    className={`w-full px-4 py-3 border rounded-lg text-lg ${
                      error ? "border-destructive" : "border-border"
                    }`}
                  />
                  {error && (
                    <p className="text-destructive text-sm mt-1">{error}</p>
                  )}

                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-base font-medium"
                    onClick={handleCustomSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <HStack gap={3} align="center">
                        <Spinner />
                        <span>Processing...</span>
                      </HStack>
                    ) : (
                      <HStack gap={3} align="center">
                        <CreditCard className="w-5 h-5" />
                        <span>Continue with Custom Amount</span>
                      </HStack>
                    )}
                  </Button>
                </VStack>
              )}

              {/* Default Action Buttons */}
              {!useCustom && (
                <VStack gap={4}>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full h-12 text-base font-medium"
                    onClick={() => setUseCustom(true)}
                  >
                    Use Custom Amount
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-12 text-base font-medium"
                    onClick={() => handleCheckout(1200)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <HStack gap={3} align="center">
                        <Spinner />
                        <span>Processing...</span>
                      </HStack>
                    ) : (
                      <HStack gap={3} align="center">
                        <CreditCard className="w-5 h-5" />
                        <span>Continue with Early Access</span>
                      </HStack>
                    )}
                  </Button>
                </VStack>
              )}

              {/* Footer */}
              <div className="text-center px-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you decide not to continue, you can remove your account and
                  data by going to{" "}
                  <Link
                    className="underline hover:text-foreground transition-colors"
                    href="/settings"
                  >
                    Settings
                  </Link>
                </p>
              </div>
            </VStack>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlanRequiredPage;
